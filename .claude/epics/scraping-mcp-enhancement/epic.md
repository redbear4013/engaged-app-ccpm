---
name: scraping-mcp-enhancement
status: backlog
created: 2025-09-30T16:10:26Z
progress: 0%
prd: .claude/prds/scraping-mcp-enhancement.md
github: https://github.com/redbear4013/engaged-app-ccpm/issues/12
---

# Epic: Event Scraping Pipeline Enhancement with MCP Integration

## Overview

Build an advanced automated event scraping system for Macau/HK using a three-tier tool architecture (Firecrawl → Chrome DevTools MCP → Playwright MCP) with intelligent escalation, comprehensive error handling, and production-grade monitoring. The system will scrape 15 event sources every 2-4 hours via GitHub Actions, process/normalize/deduplicate events, and store to Supabase with revision tracking. Architecture is Supabase-only (no Redis) leveraging in-process concurrency for Phase 1 scale (≤15 sources).

**Key Technical Approach**: Configuration-driven source adapters, automatic tool selection based on field coverage, circuit breakers for resilience, and Supabase tables for metrics/logs/alerts.

## Architecture Decisions

### Core Decisions

1. **Multi-Tool Scraping Chain**: Firecrawl (lightweight) → Chrome DevTools MCP (XHR/network capture) → Playwright MCP (complex interactions)
   - **Rationale**: Different sites require different strategies. Start efficient, escalate as needed.
   - **Auto-escalation**: Trigger when field coverage <70% or SPA markers detected

2. **Supabase-Only Architecture (Phase 1)**: No Redis/BullMQ
   - **Rationale**: 15 sources at 2-4h cadence = ~6-8 jobs/hour. GitHub Actions + in-process orchestration sufficient.
   - **Scaling Trigger**: Introduce Redis when sources ≥50, cadence <1h, or p95 runtime >20min

3. **GitHub Actions Scheduling**: Separate workflows for 2h and 4h cadences
   - **Rationale**: Native cron, free tier sufficient, simple deployment
   - **Concurrency**: maxConcurrent=3 enforced in-process by orchestrator

4. **Configuration-Driven Adapters**: JSON config per source (`config/sources.json`)
   - **Rationale**: Add new sources without code changes, per-source tool/schedule overrides
   - **Pattern**: Base adapter class + source-specific selector mappings

5. **Event Classification**: Rule-based (event/attraction/invalid)
   - **Rationale**: Sufficient for Phase 1. Collect labeled data for ML in Phase 2.
   - **Review Queue**: Confidence 0.5-0.7 → admin review

### Technology Stack

- **Runtime**: Node.js 20 (LTS), TypeScript strict mode
- **Scraping**: Firecrawl API + Chrome DevTools MCP + Playwright MCP
- **Database**: Supabase PostgreSQL (optional TimescaleDB extension for metrics)
- **Storage**: Supabase Storage (images)
- **CDN**: Cloudflare
- **Scheduling**: GitHub Actions cron (no external queue)
- **Monitoring**: Custom React dashboard + Slack webhooks + email alerts
- **Testing**: Jest + Playwright Test + Nock (HTTP mocking)

### Data Architecture

**Tables**:
- `events`: Core event data with source attribution
- `event_revisions`: Change tracking with diffs
- `scraping_runs`: Per-run metrics (engine used, events found, duration, errors)
- `scraping_logs`: Detailed logs with JSONB metadata
- `circuit_breaker_state`: Per-source failure tracking and state

**Deduplication Strategy**:
- Primary: Exact match on `(normalized_title, start_date, venue_name)`
- Secondary: Fuzzy (title cosine ≥0.92 + start ±1 day + venue overlap ≥0.6)
- Tertiary: Same `ticket_url` or canonical URL

## Technical Approach

### Backend Services

#### 1. Orchestrator Service (`src/services/scraping/orchestrator.ts`)

**Responsibilities**:
- Load source configs from JSON
- Prioritize sources by schedule and last run
- Spawn workers with concurrency control (maxConcurrent=3)
- Implement circuit breaker logic per source
- Aggregate results and trigger alerts

**Key Logic**:
```typescript
async function runOrchestrator(configPath: string) {
  const sources = loadSourceConfig(configPath);
  const prioritized = prioritizeSources(sources); // by schedule + last run

  const runningTasks = [];
  for (const source of prioritized) {
    if (runningTasks.length >= MAX_CONCURRENT) {
      await Promise.race(runningTasks);
    }
    if (circuitBreaker.isOpen(source.id)) continue;

    const task = scrapeSource(source).finally(() => {
      runningTasks.splice(runningTasks.indexOf(task), 1);
    });
    runningTasks.push(task);
  }

  await Promise.all(runningTasks);
}
```

#### 2. Tool Selector (`src/services/scraping/tool-selector.ts`)

**Responsibilities**:
- Implement fallback chain: Firecrawl → DevTools → Playwright
- Auto-escalation based on field coverage and site markers
- Track performance metrics per engine per source
- Auto-promote engines after 3 consecutive successes with >95% coverage

**Escalation Logic**:
```typescript
async function selectAndExtract(url: string, config: SourceConfig): Promise<ExtractResult> {
  let result = await tryFirecrawl(url, config);

  if (result.coverage < 0.7 || hasSPAMarkers(result.html)) {
    result = await tryChromeDevTools(url, config);
  }

  if (result.coverage < 0.7 || config.requiresInteraction) {
    result = await tryPlaywright(url, config);
  }

  await persistMetrics(config.source_id, result.engine, result.coverage, result.duration);
  return result;
}
```

#### 3. Source Adapters (`src/adapters/`)

**Pattern**: Base adapter class + per-source implementations

**Base Adapter**:
```typescript
abstract class BaseAdapter {
  abstract selectors: SelectorMap;
  abstract extractEvent(element: Element): Partial<Event>;

  async scrape(html: string): Promise<Event[]> {
    const events = [];
    const elements = this.findEventElements(html);
    for (const el of elements) {
      const event = this.extractEvent(el);
      if (this.validate(event)) {
        events.push(this.normalize(event));
      }
    }
    return events;
  }
}
```

**Source-Specific Adapters**:
- `broadway.ts`: Broadway Macau (DevTools MCP, XHR capture)
- `mgto.ts`: MGTO Events (Firecrawl, fallback DevTools)
- `timable.ts`: Timable HK/MO (DevTools, infinite scroll)
- `galaxy.ts`: Galaxy Arena/GICC (DevTools)
- `venetian.ts`: Venetian Cotai Arena (DevTools)
- `londoner.ts`: Londoner Macao (DevTools)

#### 4. Data Pipeline (`src/services/scraping/pipeline.ts`)

**Flow**:
```
Raw extraction
  → Field normalization (dates to UTC, prices to HKD)
  → Classification (event/attraction/invalid)
  → Deduplication (3-tier matching)
  → Image download & optimization (ETag-aware)
  → Database upsert with revision diff
  → Alert on anomalies (0 events, coverage drop >30%)
```

**Key Components**:
- **Normalizer**: Dates to UTC ISO8601, prices to HKD, venue names to canonical form
- **Classifier**: Rule-based with confidence scores
- **Deduplicator**: Fuzzy matching with configurable thresholds
- **Image Processor**: Resize to 1600px, WebP conversion, content-hash keys

#### 5. Circuit Breaker (`src/services/scraping/circuit-breaker.ts`)

**States**: CLOSED → OPEN (3 failures) → HALF_OPEN (1h hold) → CLOSED/OPEN

**Implementation**:
```typescript
class CircuitBreaker {
  private state: Map<string, CircuitState>;
  private failures: Map<string, Date[]>;
  private openUntil: Map<string, Date>;

  async execute<T>(sourceId: string, fn: () => Promise<T>): Promise<T> {
    if (this.isOpen(sourceId)) {
      throw new CircuitOpenError(sourceId);
    }

    try {
      const result = await fn();
      this.recordSuccess(sourceId);
      return result;
    } catch (error) {
      this.recordFailure(sourceId);
      throw error;
    }
  }

  private isOpen(sourceId: string): boolean {
    const state = this.state.get(sourceId);
    if (state === 'OPEN') {
      const openUntil = this.openUntil.get(sourceId);
      if (Date.now() > openUntil.getTime()) {
        this.state.set(sourceId, 'HALF_OPEN'); // Time to probe
        return false;
      }
      return true;
    }
    return false;
  }
}
```

#### 6. Monitoring Service (`src/services/monitoring/`)

**Components**:
- **Metrics Collector**: Write to `scraping_runs` and `scraping_logs` tables
- **Alert Manager**: Slack webhooks for warnings, email for critical failures
- **Dashboard API**: Endpoints for real-time metrics and sparklines

**Alert Triggers**:
- Error rate >10% in single run
- Zero events from Priority 1 source
- Circuit open for Priority 1 source
- p95 runtime >2× baseline

### Frontend Components

#### Admin Dashboard (`src/pages/admin/scraping-monitor.tsx`)

**Features**:
- Real-time run list with status indicators
- Per-source sparklines (events scraped, field coverage)
- Engine breakdown pie chart
- Failure reasons table with filters
- Circuit breaker state indicators
- Manual trigger buttons per source

**Data Fetching**: Supabase realtime subscriptions for live updates

### Infrastructure

#### GitHub Actions Workflows

**2-Hour Cadence** (`.github/workflows/ingest-priority.yml`):
```yaml
on:
  schedule:
    - cron: "0 */2 * * *"  # Priority 1 sources
```

**4-Hour Cadence** (`.github/workflows/ingest-standard.yml`):
```yaml
on:
  schedule:
    - cron: "0 */4 * * *"  # Priority 2-3 sources
```

**Orchestrator Invocation**:
```bash
node dist/scripts/ingest.js \
  --config config/sources.json \
  --priority 1  # or --priority 2,3
```

#### Configuration Management

**`config/sources.json`**:
```json
{
  "sources": [
    {
      "id": "broadway",
      "name": "Broadway Macau Theatre",
      "url": "https://www.broadwaymacau.com.mo/upcoming-events-and-concerts/",
      "priority": 1,
      "schedule": "*/2",
      "engine": "devtools",
      "capture": "xhr-first",
      "maxScrolls": 4,
      "rateLimit": 0.5,
      "timeout": 150000
    }
  ]
}
```

## Implementation Strategy

### Development Phases

**Phase 1: Foundation (Weeks 1-2)**
- Orchestrator framework with circuit breaker
- Tool selector with Firecrawl + Chrome DevTools MCP integration
- Priority 1 source adapters: MGTO, Broadway, Galaxy, Venetian, Londoner, Timable
- Database schema and Supabase setup

**Phase 2: Quality & Monitoring (Weeks 3-4)**
- Deduplication engine with fuzzy matching
- Event classification rules
- Image optimization pipeline
- Revision tracking system
- Monitoring dashboard UI
- Slack/email alerting

**Phase 3: Expansion (Weeks 5-6)**
- Priority 2-3 source adapters (9 additional sources)
- Production deployment to GitHub Actions
- Documentation (runbook, adapter guide)
- Performance testing and optimization

### Risk Mitigation

1. **Source Site Changes**: Automated tests detect broken selectors → alert immediately
2. **GitHub Actions Cost**: Monitor usage weekly, optimize to <500 minutes/month
3. **MCP Server Instability**: Multi-tool fallback chain + circuit breakers
4. **Performance Degradation**: Horizontal scaling via increased concurrency

### Testing Approach

**Unit Tests** (Jest):
- Tool selector logic (escalation triggers)
- Deduplication algorithm (fuzzy matching accuracy)
- Circuit breaker state transitions
- Data normalization (date parsing, timezone conversion)

**Integration Tests** (Playwright Test):
- Source adapters with mocked HTML responses
- Full pipeline from extraction to database upsert
- Alert triggering logic

**E2E Tests**:
- Full scraping run against test sources
- Error scenarios (timeouts, HTTP errors, malformed data)
- Circuit breaker behavior under failures

**Performance Tests**:
- Scrape 15 sources concurrently, measure total duration
- Database bulk insert throughput (1000 events)
- Image optimization speed (100 images)

## Task Breakdown Preview

High-level tasks for implementation (aim for ≤10 tasks):

### Task 1: Core Infrastructure & Orchestrator
**Scope**: GitHub Actions workflows, orchestrator framework, circuit breaker, tool selector
**Effort**: 20-24 hours
**Parallel**: Yes (no dependencies)
**Deliverables**:
- GitHub Actions workflows (2h and 4h cadences)
- Orchestrator with in-process concurrency control
- Circuit breaker implementation
- Tool selector with Firecrawl + Chrome DevTools MCP integration
- Configuration loader (`config/sources.json`)

### Task 2: Database Schema & Supabase Setup
**Scope**: Tables for events, revisions, scraping_runs, logs, circuit_breaker_state
**Effort**: 8-10 hours
**Parallel**: Yes (can run alongside Task 1)
**Deliverables**:
- Database migrations
- Row-level security policies
- Indexes for performance
- Sample data for testing

### Task 3: Priority 1 Source Adapters (6 sources)
**Scope**: MGTO, Broadway, Galaxy, Venetian, Londoner, Timable
**Effort**: 24-28 hours (4-5 hours per adapter)
**Parallel**: Partially (after Tasks 1-2 complete)
**Deliverables**:
- Base adapter abstract class
- 6 source-specific adapters with selector mappings
- Unit tests with mocked HTML
- Integration tests

### Task 4: Data Pipeline & Quality Controls
**Scope**: Normalization, classification, deduplication, revision tracking
**Effort**: 16-20 hours
**Parallel**: Partially (after Task 2 complete)
**Deliverables**:
- Field normalization logic (dates, prices, venues)
- Event classification rules with confidence scoring
- Deduplication engine (3-tier matching)
- Revision tracking with diffs
- Admin review queue for low-confidence events

### Task 5: Image Optimization Pipeline
**Scope**: Download, resize, WebP conversion, CDN integration
**Effort**: 8-10 hours
**Parallel**: Yes (independent of other tasks)
**Deliverables**:
- ETag-aware image downloader
- Resize + WebP conversion
- Supabase Storage integration
- Cloudflare CDN setup
- Content-hash based deduplication

### Task 6: Monitoring Dashboard & Alerting
**Scope**: Admin UI, metrics collection, Slack/email alerts
**Effort**: 16-20 hours
**Parallel**: Partially (after Tasks 1-2 complete)
**Deliverables**:
- React dashboard with real-time metrics
- Per-source sparklines and engine breakdown
- Alert manager with Slack webhooks
- Email alerts for critical failures
- Manual trigger UI

### Task 7: Priority 2-3 Source Adapters (9 sources)
**Scope**: Studio City, MGM, AsiaWorld, HK Coliseum, MICE, Wynn, Sands, West Kowloon, Eventbrite
**Effort**: 20-24 hours
**Parallel**: Yes (parallel to Task 6)
**Deliverables**:
- 9 additional source adapters
- Configuration entries in `sources.json`
- Unit and integration tests

### Task 8: Testing & Quality Assurance
**Scope**: Comprehensive test suite, E2E tests, performance tests
**Effort**: 12-16 hours
**Parallel**: Yes (can start after Task 3)
**Deliverables**:
- Unit tests (>80% coverage)
- Integration tests with mocked sources
- E2E tests for full scraping workflow
- Performance benchmarks
- Manual QA checklist

### Task 9: Production Deployment & Documentation
**Scope**: GitHub Actions setup, secrets management, runbooks
**Effort**: 8-10 hours
**Parallel**: No (final deployment)
**Deliverables**:
- Production deployment to GitHub Actions
- Secrets configured (Supabase, Firecrawl, Slack)
- Monitoring dashboard deployed
- Adapter development guide
- Troubleshooting runbook
- Launch readiness checklist

### Task 10: Performance Optimization & Launch
**Scope**: Monitoring tuning, performance optimization, launch
**Effort**: 8-10 hours
**Parallel**: No (final validation)
**Deliverables**:
- 48-hour burn-in with monitoring
- Alert threshold tuning
- Performance optimization based on real data
- Stakeholder demo
- Launch approval

**Total Tasks**: 10
**Parallel Tasks**: 7 (Tasks 1, 2, 5 fully parallel; Tasks 3-4, 6-8 partially parallel)
**Sequential Tasks**: 3 (Tasks 9-10 sequential at end)
**Estimated Total Effort**: 140-172 hours (6-7 weeks for single developer)

## Tasks Created

- [ ] [#13](https://github.com/redbear4013/engaged-app-ccpm/issues/13) - Core Infrastructure & Orchestrator (parallel: true, 20-24h, Size: L)
- [ ] [#14](https://github.com/redbear4013/engaged-app-ccpm/issues/14) - Database Schema Extensions (parallel: true, 4-6h, Size: S) - extends existing schema
- [ ] [#15](https://github.com/redbear4013/engaged-app-ccpm/issues/15) - Priority 1 Source Adapters (parallel: false, depends: 13,14, 24-28h, Size: L)
- [ ] [#16](https://github.com/redbear4013/engaged-app-ccpm/issues/16) - Data Pipeline & Quality Controls (parallel: false, depends: 14, 16-20h, Size: L)
- [ ] [#17](https://github.com/redbear4013/engaged-app-ccpm/issues/17) - Image Optimization Pipeline (parallel: true, 8-10h, Size: M)
- [ ] [#18](https://github.com/redbear4013/engaged-app-ccpm/issues/18) - Monitoring Dashboard & Alerting (parallel: false, depends: 13,14, 16-20h, Size: L)
- [ ] [#19](https://github.com/redbear4013/engaged-app-ccpm/issues/19) - Priority 2-3 Source Adapters (parallel: true, depends: 15, 20-24h, Size: L)
- [ ] [#20](https://github.com/redbear4013/engaged-app-ccpm/issues/20) - Testing & Quality Assurance (parallel: false, depends: 15, 12-16h, Size: M)
- [ ] [#21](https://github.com/redbear4013/engaged-app-ccpm/issues/21) - Production Deployment & Documentation (parallel: false, depends: 13,14,15,16,17,18,19,20, 8-10h, Size: M)
- [ ] [#22](https://github.com/redbear4013/engaged-app-ccpm/issues/22) - Performance Optimization & Launch (parallel: false, depends: 21, 8-10h, Size: M)

Total tasks: 10
Parallel tasks: 4 (Tasks 001, 002, 005, 007)
Partially parallel tasks: 3 (Tasks 003, 004, 006, 008)
Sequential tasks: 3 (Tasks 009, 010, and final phase)
Estimated total effort: 136-168 hours (reduced from 140-172 due to existing Supabase setup)

## Dependencies

### External Dependencies

1. **Firecrawl API**: API key required, rate limits to respect
2. **Chrome DevTools MCP**: MCP server installed and configured
3. **Playwright MCP**: MCP server installed and configured
4. **Supabase**: PostgreSQL database, Storage bucket, RLS policies
5. **GitHub Actions**: Workflows configured, secrets stored
6. **Cloudflare CDN**: Account setup, DNS configuration
7. **Slack API**: Webhook URL for alerts

### Internal Dependencies

1. **Database Schema** (from event-calendar-app Task #2): `events` table must exist
2. **Authentication System** (Task #4): Admin dashboard requires auth
3. **Supabase Configuration**: Environment variables, service role key

### Critical Path

```
Tasks 1, 2 (parallel)
  → Task 3 (Priority 1 adapters)
  → Task 4 (Data pipeline)
  → Task 6 (Monitoring)
  → Task 9 (Deployment)
  → Task 10 (Launch)
```

Tasks 5 (Images), 7 (Priority 2-3), 8 (Testing) can run in parallel with critical path.

## Success Criteria (Technical)

### Launch Criteria (Week 6)

1. **Coverage**: All 6 Priority 1 sources operational with >85% field coverage
2. **Reliability**: 99%+ success rate over 7-day period
3. **Performance**: <2s p95 extraction time, <12 min full scraping run
4. **Data Quality**: <5% duplicate rate, >90% classification accuracy
5. **Monitoring**: Dashboard live, alerts configured, no critical gaps

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Field Coverage | >90% | Required fields filled / Total required fields |
| Extraction Speed | <2s p95 | Time from request to parsed event object |
| Scraping Run Duration | <15 min p95 | Total orchestrator execution time |
| Duplicate Rate | <5% | Duplicates detected / Total events |
| Uptime | 99.5% | Successful runs / Total scheduled runs |
| Alert Response Time | <2 min | Alert triggered → Slack message received |

### Quality Gates

**Must Pass Before Launch**:
- [ ] All Priority 1 sources >85% field coverage
- [ ] Zero unhandled exceptions in 48-hour burn-in
- [ ] Circuit breaker correctly opens/closes on failures
- [ ] Monitoring dashboard loads in <2s
- [ ] Slack alerts deliver within 1 minute
- [ ] Image optimization <5s per image
- [ ] Database upsert throughput >100 events/sec
- [ ] Manual trigger executes successfully for all sources

### Non-Functional Requirements

- **Performance**: <2s p95 per page, <15 min full run, >100 events/sec DB writes
- **Scalability**: Support 15 sources (Phase 1), ready for 50+ (Phase 2)
- **Reliability**: 99.5% uptime, auto-recovery within 2 hours
- **Security**: Secrets in GitHub Secrets, RLS policies, no PII in logs
- **Maintainability**: Add new source in <2 hours, config-driven

## Estimated Effort

### Overall Timeline

- **MVP (Priority 1 only)**: 4 weeks (Tasks 1-6, 8-10)
- **Full Phase 1**: 6 weeks (all 10 tasks)
- **Critical Path**: Tasks 1-2-3-4-6-9-10 (12 days sequential work)

### Resource Requirements

- **Primary**: 1 full-stack developer (TypeScript/Node.js/React)
- **DevOps**: Part-time for GitHub Actions setup, monitoring deployment
- **QA**: Part-time for manual testing, adapter validation

### Effort Breakdown by Task

| Task | Effort (hours) | Complexity | Risk |
|------|----------------|------------|------|
| 1. Orchestrator | 20-24 | High | Medium (MCP integration) |
| 2. Database | 8-10 | Low | Low |
| 3. Priority 1 Adapters | 24-28 | Medium | Medium (site changes) |
| 4. Data Pipeline | 16-20 | High | Low |
| 5. Image Optimization | 8-10 | Low | Low |
| 6. Monitoring | 16-20 | Medium | Low |
| 7. Priority 2-3 Adapters | 20-24 | Medium | Medium (site changes) |
| 8. Testing | 12-16 | Medium | Low |
| 9. Deployment | 8-10 | Low | Medium (secrets mgmt) |
| 10. Launch | 8-10 | Low | Low |
| **Total** | **140-172** | - | - |

### Key Milestones

- **Week 2**: Orchestrator + Priority 1 adapters functional
- **Week 4**: Data pipeline + monitoring operational
- **Week 6**: All 15 sources live, 48-hour burn-in complete

### Cost Estimates

- **GitHub Actions**: <$0/month (free tier sufficient, <500 min/month)
- **Supabase**: $25/month (Pro plan for TimescaleDB, >500MB DB)
- **Cloudflare CDN**: $0/month (free tier)
- **Firecrawl API**: $0-50/month (depends on usage)
- **Total**: <$100/month operational cost

## Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Source site changes | High | High | Automated tests, coverage alerts, fallback to stale data |
| MCP server instability | Medium | High | Multi-tool fallback, circuit breakers, retry logic |
| GitHub Actions cost overrun | Low | Medium | Usage monitoring, optimize frequency, self-hosted runners |
| Performance degradation | Low | Medium | Horizontal scaling via concurrency, caching |
| ToS violations | Low | Critical | Legal review, respect robots.txt, rate limiting |

## Definition of Done

- [ ] Code implemented for all 10 tasks
- [ ] Unit tests passing with >80% coverage
- [ ] Integration tests passing for all adapters
- [ ] E2E tests passing for full workflow
- [ ] Performance tests meet benchmarks (<2s p95, <15 min run)
- [ ] Monitoring dashboard deployed and functional
- [ ] Slack/email alerts configured and tested
- [ ] Documentation complete (runbook, adapter guide)
- [ ] 48-hour burn-in with 99%+ success rate
- [ ] Code reviewed and approved
- [ ] Production deployment successful
- [ ] Launch approval from stakeholders