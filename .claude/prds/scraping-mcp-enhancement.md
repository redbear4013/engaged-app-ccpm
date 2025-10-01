---
name: scraping-mcp-enhancement
description: Advanced event scraping pipeline with MCP integration, multi-tool fallback, and intelligent scheduling for Macau/HK event discovery
status: backlog
created: 2025-09-30T14:56:38Z
---

# PRD: Event Scraping Pipeline Enhancement with MCP Integration

## Executive Summary

Enhance the existing event scraping system with a sophisticated multi-tool architecture leveraging Firecrawl, Chrome DevTools MCP, and Playwright MCP. The system will automatically scrape 15+ event sources across Macau and Hong Kong every 4 hours, intelligently selecting the optimal scraping tool based on site characteristics, with comprehensive monitoring, error handling, and data quality controls. Target launch covers high-signal venues (Broadway Macau, Galaxy Arena, MGTO) and aggregators (Timable, Eventbrite), delivering 70%+ field coverage with <2s p95 extraction time.

**Phase 1 Architecture Note**: Supabase-only implementation without Redis. The 2-4 hour cadence with ≤15 sources does not require external job queues—GitHub Actions orchestration with in-process concurrency is sufficient. Redis/BullMQ deferred to Phase 2 when scaling beyond 50 sources or sub-1-hour scheduling.

**Business Value**: Automate event discovery for 50k+ events annually, reduce manual curation by 90%, enable real-time event updates for users, and establish scalable foundation for regional expansion.

## Problem Statement

### Current State

The existing event scraping pipeline (Task #5 from event-calendar-app epic) uses basic Playwright + Firecrawl for data collection but lacks:

- **Tool Intelligence**: No automatic selection between scraping methods based on site complexity
- **JavaScript Handling**: Struggles with SPA frameworks, infinite scroll, and XHR-loaded content
- **Resilience**: Basic retry logic without circuit breakers or graceful degradation
- **Monitoring**: Limited visibility into scraping health, coverage metrics, and failure patterns
- **Scheduling**: Manual or simplistic scheduling without per-source optimization
- **Data Quality**: Basic deduplication without fuzzy matching or revision tracking

### Why Now?

1. **User Need**: Community demands comprehensive, up-to-date event listings across Macau/HK
2. **Technical Maturity**: MCP servers (Chrome DevTools, Playwright) provide production-ready APIs
3. **Competition**: Timable and other aggregators already provide automated discovery
4. **Scale Requirements**: Manual curation cannot handle 15+ sources with 4-hour freshness SLA
5. **Foundation Phase**: Establishing robust ingestion pipeline before AI matching and recommendation features

### Impact of Not Solving

- **User Churn**: Incomplete or stale event data drives users to competitors
- **Operational Cost**: Manual event entry costs 20+ hours/week
- **Technical Debt**: Brittle scraping logic requires constant maintenance
- **Growth Blocker**: Cannot expand to new cities without scalable automation

## User Stories

### Primary Personas

**Persona 1: Event Discovery User (Sarah)**
- **Profile**: 28-year-old Hong Kong resident, visits Macau monthly for entertainment
- **Goal**: Discover concerts, shows, and events across venues without visiting 10+ websites
- **Pain Point**: Events posted on venue sites don't appear in calendar for 24+ hours

**Persona 2: Event Organizer (David)**
- **Profile**: Marketing manager at Galaxy Entertainment, posts events to official channels
- **Goal**: Ensure events appear in discovery platforms immediately after publication
- **Pain Point**: Manual submission to aggregators is time-consuming and error-prone

**Persona 3: Platform Administrator (Alex)**
- **Profile**: DevOps engineer maintaining the scraping infrastructure
- **Goal**: Monitor scraping health, debug failures, optimize performance
- **Pain Point**: No visibility into which sources are failing or why

### User Journeys

#### Journey 1: Automated Event Discovery (Sarah)

1. **Trigger**: Broadway Macau posts new concert announcement at 10:00 AM
2. **System Action** (10:30 AM): Scheduled scraper runs, detects new event
3. **Tool Selection**: Firecrawl fails to extract ticket URL → escalates to Chrome DevTools MCP → captures XHR with booking link
4. **Processing**: Deduplication checks (no match), normalization, classification (event), image optimization
5. **Storage**: Event saved to database with source attribution and revision history
6. **User Experience** (11:00 AM): Sarah opens app, sees concert in "Trending" section with complete details
7. **Success Metric**: Event available within 1 hour of publication with 95%+ field coverage

#### Journey 2: Resilient Scraping with Failures (Alex)

1. **Trigger**: Venetian Arena website returns 503 errors
2. **System Action**: Retry with exponential backoff (5s, 20s, 60s) → all fail
3. **Circuit Breaker**: Opens circuit after 3 consecutive failures, prevents further attempts for 1 hour
4. **Alert**: Slack notification sent: "⚠️ Venetian scraper circuit open - 3 consecutive failures"
5. **Degradation**: Users still see last-known Venetian events (up to 72 hours stale) with "Last updated 4h ago" label
6. **Recovery**: After 1 hour, circuit enters half-open state, single probe attempt succeeds
7. **Resolution**: Circuit closes, normal scheduling resumes, alert sent: "✅ Venetian scraper recovered"
8. **Success Metric**: Zero user-visible downtime, automatic recovery without manual intervention

#### Journey 3: Data Quality Management (David)

1. **Trigger**: Galaxy Arena updates concert date from Oct 15 → Oct 18
2. **System Action**: Next scrape detects change via hash comparison
3. **Revision Tracking**: Creates event_revisions entry with diff: `{start_date: "2025-10-15" → "2025-10-18"}`
4. **User Calendar Update**: Users who saved the event see "Event updated" badge with change details
5. **Notification**: Pro users receive email: "Concert date changed - check your calendar"
6. **Success Metric**: Zero duplicate entries, all saved events reflect accurate information

## Requirements

### Functional Requirements

#### FR1: Multi-Tool Scraping Architecture

- **FR1.1**: Implement three-tier tool selection: Firecrawl → Chrome DevTools MCP → Playwright MCP
- **FR1.2**: Automatic escalation based on field coverage (<70% triggers escalation)
- **FR1.3**: Per-source engine configuration via JSON file (`config/sources.json`)
- **FR1.4**: Engine performance tracking with automatic promotion (3 consecutive successes with >95% coverage)
- **FR1.5**: Parallel execution with configurable concurrency limits (default: 3 concurrent sources)

**Acceptance Criteria**:
- System correctly selects Firecrawl for static sites (MGTO)
- Auto-escalates to DevTools MCP when detecting SPA markers or XHR-loaded content
- Playwright MCP used only for complex interactions (modal dismissals, navigation)
- Per-source configs load from JSON and override defaults
- Performance metrics persisted per run: `{source, engine, fields_filled, time_ms, fail_reason}`

#### FR2: Comprehensive Event Source Coverage

**Phase 1 (Weeks 1-2)**: Priority 1 sources
- **FR2.1**: MGTO Events Calendar (Firecrawl, fallback DevTools)
- **FR2.2**: Broadway Macau Theatre (DevTools MCP, XHR capture)
- **FR2.3**: Galaxy Arena/GICC (DevTools MCP)
- **FR2.4**: The Venetian Cotai Arena (DevTools MCP)
- **FR2.5**: Londoner Macao (DevTools MCP)
- **FR2.6**: Timable HK/MO (DevTools MCP, infinite scroll support)

**Phase 1 (Weeks 3-4)**: Priority 2 sources
- **FR2.7**: Studio City, MGM Cotai, AsiaWorld-Expo, HK Coliseum

**Phase 1 (Weeks 5-6)**: Priority 3 sources
- **FR2.8**: MICE Portal, Wynn Palace, Sands Macao, West Kowloon, Eventbrite HK

**Acceptance Criteria**:
- All Priority 1 sources successfully scraped with >85% field coverage
- Priority 2 sources implemented with >80% coverage
- Priority 3 sources implemented with >75% coverage
- ToS-compliant scraping for all sources (respect robots.txt, rate limits)
- Each source includes adapter with selector mappings and extraction logic

#### FR3: Intelligent Scheduling & Rate Control

- **FR3.1**: GitHub Actions cron workflow: `0 */4 * * *` (every 4 hours)
- **FR3.2**: Per-source schedule overrides (MGTO/Broadway/Galaxy: every 2 hours via separate workflow)
- **FR3.3**: In-process concurrency control (maxConcurrent=3) via orchestrator
- **FR3.4**: Per-domain rate limiting (0.5-1 req/sec configurable)
- **FR3.5**: Peak hours throttling (optional, halve rate if API latency >2× baseline)
- **FR3.6**: Manual trigger support via workflow_dispatch

**Implementation Note**: No external job queue (Redis/Bull) required for Phase 1. GitHub Actions spawns orchestrator process which manages concurrency in-memory. Scheduling handled by multiple GitHub Actions workflows (2h and 4h cadences).

**Acceptance Criteria**:
- Priority 1 sources run every 2 hours as configured
- Other sources run every 4 hours
- Orchestrator enforces maxConcurrent=3 in-process
- No domain receives >1 req/sec across all concurrent scrapes
- Peak throttling activates when detected, returns to normal automatically
- Manual triggers execute immediately without waiting for schedule

#### FR4: Advanced Error Handling & Resilience

- **FR4.1**: Exponential retry logic: 3 attempts with backoff (5s, 20s, 60s)
- **FR4.2**: Circuit breaker per source: open after 3 consecutive failures, hold 1 hour
- **FR4.3**: Half-open state: single probe attempt after hold period
- **FR4.4**: Graceful degradation: show stale data (up to 72 hours) with timestamp
- **FR4.5**: Timeout enforcement: 90s Firecrawl, 150s DevTools, 240s Playwright (5 min hard cap)

**Acceptance Criteria**:
- Transient failures automatically recover without manual intervention
- Circuit breakers prevent cascade failures and resource exhaustion
- Users never see empty state when stale data exists (<72h old)
- All operations timeout and log reason before exhausting resources
- Circuit state transitions logged with timestamps and failure reasons

#### FR5: Data Processing & Quality Controls

**FR5.1: Deduplication Strategy**
- Primary: Exact match on `(normalized_title, start_date, venue_name)`
- Secondary: Fuzzy matching (title cosine ≥0.92 + start ±1 day + venue overlap ≥0.6)
- Tertiary: URL matching (same `ticket_url` or canonical URL)

**FR5.2: Create vs Update Logic**
- Upsert by `(source, source_id)` if available
- Derive stable hash if `source_id` missing: `hash(normalized_title + start_date + venue_name)`
- Write to `event_revisions` table on field changes with diff

**FR5.3: Event Classification**
- **Event**: Time-bound with concrete start date (optional end)
- **Attraction**: Ongoing/multi-month, no specific start (e.g., museum exhibitions)
- **Invalid**: Navigation/ads/test pages, missing required fields

**FR5.4: Auto-Rejection Rules**
- Events older than 60 days (past events)
- Events >2 years in future (unless whitelisted)
- Events missing both title and start date after all tools

**FR5.5: Human Review Queue**
- Classification confidence 0.5-0.7 → `/admin/review` with snapshot
- Admin can approve/reject/reclassify with feedback

**Acceptance Criteria**:
- Duplicate events merged across sources with confidence scores
- User-saved events preserved on updates with change notifications
- Classification accuracy >90% on manual validation sample (n=100)
- Auto-reject rules prevent spam and outdated content
- Review queue accessible to admins with batch operations

#### FR6: Multi-Photo Support & Image Optimization

- **FR6.1**: Extract up to 3 images per event (poster + 2 alternates)
- **FR6.2**: Prefer `og:image` or largest poster from source
- **FR6.3**: Resize to 1600px max width, convert to WebP, strip metadata
- **FR6.4**: Store to S3 with content-hash keys: `{hash}.webp`
- **FR6.5**: ETag/Last-Modified headers: only re-download if changed
- **FR6.6**: CDN integration (Cloudflare/CloudFront) with 30-day cache
- **FR6.7**: Auto-generate alt text: `"{title} at {venue}, {date}"`

**Acceptance Criteria**:
- Images optimized to <300KB per photo
- CDN cache hit rate >80% after first week
- Alt text generated for accessibility compliance
- Duplicate images (same content hash) reused across events
- Fallback to previous poster if new download fails

#### FR7: Comprehensive Monitoring & Alerting

**FR7.1: Metrics Dashboard**
- Real-time run list with status (running/success/failed)
- Per-source sparklines (events scraped, field coverage, engine used)
- Engine breakdown (Firecrawl/DevTools/Playwright usage %)
- Failures by reason (timeout, parse error, HTTP error, circuit open)
- Last success timestamp per source
- Median items per run (7-day rolling window)

**FR7.2: Alert Channels**
- **Slack** (primary): All warnings and errors
- **Email** (critical only): Zero events from priority source, job crash, circuit open >6h

**FR7.3: Alert Triggers**
- Error rate >10% on a source in single run
- Zero events scraped from priority 1 source
- Run time > p95 + 2σ (performance degradation)
- Parser coverage <70% required fields
- Circuit breaker open for priority 1 source

**FR7.4: Logging & Artifacts**
- Detailed logs: 30-day retention (JSON structured, stored in Supabase tables)
- Aggregated metrics: 180-day retention (Supabase with optional TimescaleDB extension)
- Raw XHR/response artifacts: 7-day retention (encrypted S3 or Supabase Storage bucket)

**Implementation Note**: All metrics and logs stored in Supabase tables (`scraping_runs`, `scraping_logs`). No Redis caching layer required for Phase 1—queries served directly from Postgres with appropriate indexes.

**Acceptance Criteria**:
- Dashboard accessible at `/admin/scraping-monitor`
- Slack receives <10 messages per day under normal operation
- Email alerts only for critical issues requiring immediate action
- All failures include actionable error messages and source links
- Logs queryable by source, date, engine, error type via Supabase queries

### Non-Functional Requirements

#### NFR1: Performance

- **NFR1.1**: Field extraction time: <2s p95 per page
- **NFR1.2**: Full scraping run (all sources): <15 minutes p95
- **NFR1.3**: Database write throughput: >100 events/sec
- **NFR1.4**: Image optimization: <5s per image
- **NFR1.5**: API response time (event search): <200ms p95

#### NFR2: Scalability

- **NFR2.1**: Support 15 sources in Phase 1, 50+ sources by Q2 2026
- **NFR2.2**: Handle 50k+ events in database without performance degradation
- **NFR2.3**: Horizontal scaling: Add more GitHub Actions runners as needed
- **NFR2.4**: In-process concurrency scales to maxConcurrent=5 without memory issues

**Phase 1 Scaling Note**: Supabase-only architecture sufficient for ≤15 sources with 2-4h cadence. **Redis/BullMQ introduction deferred to Phase 2**, triggered by:
- Sources ≥50 (exceeds GitHub Actions workflow limits)
- Scheduling cadence <1 hour (requires fine-grained queueing)
- p95 runtime >20 minutes (needs distributed processing)

#### NFR3: Reliability

- **NFR3.1**: Scraping uptime: 99.5% (excluding source site downtime)
- **NFR3.2**: Zero data loss on transient failures
- **NFR3.3**: Automatic recovery from all error states within 2 hours
- **NFR3.4**: Database transactions: ACID compliant, no partial writes

#### NFR4: Security

- **NFR4.1**: Secrets (API keys, tokens) stored in GitHub Secrets
- **NFR4.2**: S3 buckets: Private, signed URLs for image access
- **NFR4.3**: Database credentials: Service role key, row-level security
- **NFR4.4**: Rate limiting prevents DDoS of source sites
- **NFR4.5**: No storage of PII (user emails, passwords) in scraping logs

#### NFR5: Maintainability

- **NFR5.1**: Source adapter architecture: Add new source in <2 hours
- **NFR5.2**: Configuration-driven: No code changes for schedule/threshold adjustments
- **NFR5.3**: Comprehensive error messages with source file/line references
- **NFR5.4**: TypeScript strict mode, ESLint, >80% test coverage
- **NFR5.5**: Documentation: Adapter development guide, troubleshooting runbook

#### NFR6: Compliance

- **NFR6.1**: Respect robots.txt for all sources
- **NFR6.2**: User-Agent header: Identifies as event discovery bot with contact email
- **NFR6.3**: GDPR-compliant data handling (no EU user data in scraping context)
- **NFR6.4**: ToS review for each source before implementation
- **NFR6.5**: Social media: API-only or official embeds (no raw scraping)

## Success Criteria

### Key Metrics

#### Launch Criteria (Week 6)

1. **Coverage**: All 6 Priority 1 sources operational with >85% field coverage
2. **Reliability**: 99%+ success rate over 7-day period
3. **Performance**: <2s p95 extraction time, <12 min full scraping run
4. **Data Quality**: <5% duplicate rate, >90% classification accuracy
5. **Monitoring**: Dashboard live, alerts configured, no critical gaps in visibility

#### 30-Day Post-Launch

1. **Event Volume**: 500+ new events discovered per week
2. **Uptime**: 99.5%+ scraping success rate
3. **User Impact**: 0 user complaints about stale data
4. **Efficiency**: <3 hours/week manual intervention required
5. **Scalability**: Priority 2 sources implemented (12 total sources active)

#### 90-Day Post-Launch

1. **Comprehensive Coverage**: All 15 Phase 1 sources operational
2. **Intelligence**: Engine auto-promotion achieving 30%+ efficiency gains
3. **Data Freshness**: 95%+ of events visible within 2 hours of publication
4. **Cost Efficiency**: <$100/month operational costs (GitHub Actions + S3 + Redis)
5. **Foundation**: Ready for AI matching integration and recommendation engine

### Measurable Outcomes

| Metric | Baseline (Manual) | Target (Automated) | Measurement |
|--------|-------------------|-------------------|-------------|
| Event Discovery Time | 24-48 hours | <2 hours | Event `created_at` - source `published_at` |
| Field Coverage | 60% (incomplete) | >90% | Required fields filled / Total required fields |
| Duplicate Rate | 15% | <5% | Duplicates detected / Total events |
| Operational Cost | 20 hours/week | <3 hours/week | Manual curation hours logged |
| Source Coverage | 3 sources | 15 sources | Active sources in `sources.json` |
| System Uptime | N/A | 99.5% | Successful runs / Total scheduled runs |

### Definition of Success

**Minimum Viable Product (MVP)**: Priority 1 sources (6) operational with automated scraping, monitoring, and error handling. Users see fresh events within 4 hours of publication with complete details.

**Full Success**: All 15 Phase 1 sources active, intelligent tool selection optimizing performance, zero manual intervention required for normal operations, platform ready for AI-powered recommendations.

## Constraints & Assumptions

### Technical Constraints

1. **GitHub Actions Limits**: 2000 minutes/month free tier → Monitor usage, optimize to <500 minutes/month
2. **Supabase Free Tier**: 500MB database, 1GB bandwidth/day → Migrate to Pro if exceeded
3. **MCP Server Dependencies**: Chrome DevTools and Playwright MCPs must be available/maintained
4. **Browser Automation**: Headless Chrome requires 1-2GB RAM per instance → Limit concurrency
5. **Network Latency**: Macau/HK sites may be slow from GitHub Actions runners (US/EU) → Consider HK-based runners if needed

### Business Constraints

1. **Timeline**: 6-week delivery for Phase 1 (all Priority 1 sources)
2. **Resources**: Single full-stack developer + DevOps support
3. **Budget**: <$100/month operational costs (scraping infrastructure)
4. **Legal**: No ToS violations, obtain permission for protected APIs
5. **Quality Bar**: >90% field coverage, <5% error rate before launch

### Assumptions

1. **Source Stability**: Event source websites maintain consistent HTML structure for >3 months
2. **API Availability**: Firecrawl API remains accessible and within rate limits
3. **MCP Maturity**: Chrome DevTools MCP and Playwright MCP are production-ready
4. **Data Volume**: <5000 new events per month across all sources
5. **User Acceptance**: Users tolerate <4 hour latency for event discovery
6. **External Dependencies**: Redis, S3, and CDN services maintain 99.9%+ uptime

### Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Source site changes break scrapers | High | Automated tests, coverage alerts, graceful fallback to stale data |
| GitHub Actions cost overruns | Medium | Usage monitoring, optimize scraping frequency, self-hosted runners |
| MCP server instability | High | Multi-tool fallback chain, circuit breakers, manual override capability |
| ToS violations | Critical | Legal review before implementation, respect robots.txt, rate limiting |
| Performance degradation at scale | Medium | Horizontal scaling via concurrency, caching, incremental scraping |

## Out of Scope

### Explicitly Not Building (Phase 1)

1. **Redis/BullMQ Job Queues**: Supabase-only architecture. GitHub Actions + in-process orchestration sufficient for ≤15 sources at 2-4h cadence. Redis caching layer not required—Postgres queries with indexes are performant enough.
2. **User-Generated Content**: Event submissions by users (defer to Organizer Portal epic)
3. **Real-Time Scraping**: Sub-4-hour latency not required for Phase 1
4. **Machine Learning Classification**: Rule-based classification sufficient initially
5. **Multi-Region Support**: Focus on Macau/HK only (no Singapore, Taiwan, mainland China)
6. **Social Media Scraping**: No Instagram/Facebook/X scraping due to ToS restrictions
7. **Ticket Purchase Integration**: Read-only event discovery, no booking functionality
8. **Historical Data**: Only scrape current/future events (no backfilling past events)
9. **Admin UI for Source Management**: JSON config files sufficient for Phase 1
10. **A/B Testing**: Single scraping strategy, no experimentation framework
11. **Custom OCR**: No text extraction from image-only event posters

### Future Considerations (Post-Phase 1)

- **Phase 2A**: ML-powered classification, image OCR for poster-only events
- **Phase 2B**: **Redis/BullMQ introduction** when scaling triggers occur:
  - Sources ≥50 (GitHub Actions workflow limits)
  - Scheduling cadence <1 hour (requires fine-grained queueing)
  - p95 runtime >20 minutes (needs distributed processing)
- **Phase 3**: Admin UI for source management, A/B testing framework
- **Phase 4**: Regional expansion (Singapore, Taiwan, mainland China)
- **Phase 5**: Real-time webhooks from partner venues

## Dependencies

### External Dependencies

1. **Firecrawl API**: Requires API key, rate limit monitoring
2. **Chrome DevTools MCP**: Requires MCP server installation and configuration
3. **Playwright MCP**: Requires MCP server installation and configuration
4. **Supabase**: PostgreSQL database with RLS policies from Task #2
5. **GitHub Actions**: Cron scheduling, workflow_dispatch for manual triggers
6. **Supabase Storage** (or AWS S3): Image storage
7. **CDN**: Cloudflare or CloudFront for image delivery
8. **Slack API**: Webhook for alert notifications

**Phase 1 Note**: No Redis dependency. External queue system deferred to Phase 2 when scaling beyond 50 sources or sub-1-hour cadence.

### Internal Dependencies

1. **Database Schema** (Task #2): `events`, `event_revisions`, `sources` tables must exist
2. **Authentication System** (Task #4): Admin dashboard requires auth
3. **Image Storage Service**: S3 or Supabase Storage bucket configured
4. **Environment Variables**: All secrets configured in GitHub Secrets and `.env`

### Data Source Dependencies

1. **robots.txt Compliance**: All sources must permit scraping
2. **API Access**: Timable, Eventbrite APIs require accounts/keys
3. **Legal Clearance**: ToS review completed for all sources
4. **Rate Limit Negotiation**: Some venues may require partnership for higher limits

### Team Dependencies

1. **DevOps**: GitHub Actions setup, secret management, monitoring dashboard deployment
2. **Legal/Compliance**: ToS review, data handling audit
3. **Design**: Admin dashboard UI/UX (if building beyond raw metrics)
4. **QA**: Manual testing of event extraction accuracy per source

## Implementation Approach

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions Cron (0 */4 * * *)                          │
│  ├─ Load config/sources.json                                │
│  ├─ Spawn workers (maxConcurrent=3)                         │
│  └─ Orchestrate scraping runs                               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Orchestrator (Node.js)                                      │
│  ├─ Source prioritization & scheduling                      │
│  ├─ Tool selection logic (Firecrawl → DevTools → Playwright)│
│  ├─ Rate limiting & concurrency control                     │
│  └─ Error handling & circuit breakers                       │
└────────┬───────────────────┬────────────────┬───────────────┘
         │                   │                │
         ▼                   ▼                ▼
┌─────────────┐    ┌──────────────────┐    ┌──────────────┐
│  Firecrawl  │    │ Chrome DevTools  │    │  Playwright  │
│     API     │    │   MCP Server     │    │  MCP Server  │
└──────┬──────┘    └────────┬─────────┘    └──────┬───────┘
       │                    │                      │
       └────────────────────┴──────────────────────┘
                            │
                            ▼
       ┌────────────────────────────────────────────┐
       │  Data Pipeline                             │
       │  ├─ HTML/JSON parsing                      │
       │  ├─ Field extraction & normalization       │
       │  ├─ Deduplication (fuzzy matching)         │
       │  ├─ Classification (event/attraction)      │
       │  └─ Image download & optimization          │
       └────────────────┬───────────────────────────┘
                        │
                        ▼
       ┌────────────────────────────────────────────┐
       │  Storage Layer                             │
       │  ├─ PostgreSQL (Supabase): event data      │
       │  ├─ S3: images (content-hash keys)         │
       │  ├─ Redis: job queue & caching             │
       │  └─ TimescaleDB: metrics & logs            │
       └────────────────┬───────────────────────────┘
                        │
                        ▼
       ┌────────────────────────────────────────────┐
       │  Monitoring & Alerting                     │
       │  ├─ Slack webhooks (warnings/errors)       │
       │  ├─ Email (critical failures)              │
       │  └─ Dashboard (/admin/scraping-monitor)    │
       └────────────────────────────────────────────┘
```

### Technology Stack

- **Runtime**: Node.js 20 (LTS)
- **Language**: TypeScript (strict mode)
- **Scraping Tools**: Firecrawl API, Chrome DevTools MCP, Playwright MCP
- **Database**: PostgreSQL (Supabase) with optional TimescaleDB extension for metrics
- **Storage**: Supabase Storage (primary) or AWS S3 (alternative)
- **CDN**: Cloudflare (or CloudFront if using S3)
- **Scheduling**: GitHub Actions cron (in-process orchestration, no external queue)
- **Monitoring**: Custom dashboard (React) + Slack + Email
- **Testing**: Jest, Playwright Test, Nock (HTTP mocking)

**Phase 1 Architecture**: Supabase-only. No Redis/Bull job queue—GitHub Actions spawns orchestrator process with in-memory concurrency control. Sufficient for 15 sources at 2-4h intervals.

### Key Components

#### 1. Orchestrator (`src/services/scraping/orchestrator.ts`)

**Responsibilities**:
- Load source configurations from JSON
- Prioritize sources based on schedule and last run
- Spawn workers with concurrency limits
- Implement circuit breaker logic per source
- Aggregate results and trigger alerts

**Interfaces**:
```typescript
interface SourceConfig {
  id: string;
  name: string;
  priority: 1 | 2 | 3;
  schedule: string; // cron format or "*/2", "*/4"
  engine: 'firecrawl' | 'devtools' | 'playwright' | 'auto';
  fallback?: 'devtools' | 'playwright';
  capture?: 'xhr-first' | 'dom-first';
  scroll?: boolean;
  maxScrolls?: number;
  timeout?: number;
  rateLimit?: number; // requests per second
}

interface ScrapingResult {
  source: string;
  engine: string;
  success: boolean;
  eventsFound: number;
  fieldsCovered: number;
  duration: number;
  error?: string;
}
```

#### 2. Tool Selector (`src/services/scraping/tool-selector.ts`)

**Responsibilities**:
- Implement fallback chain: Firecrawl → DevTools MCP → Playwright MCP
- Automatic escalation based on field coverage and site characteristics
- Performance tracking per engine per source
- Auto-promotion of engines after 3 consecutive successes

**Logic**:
```typescript
async function selectAndExtract(url: string, config: SourceConfig): Promise<Event[]> {
  let result = await tryFirecrawl(url, config);
  if (result.coverage < 0.7 || hasSPAMarkers(result)) {
    result = await tryChromeDevTools(url, config);
  }
  if (result.coverage < 0.7 || config.requiresInteraction) {
    result = await tryPlaywright(url, config);
  }
  return result.events;
}
```

#### 3. Source Adapters (`src/adapters/`)

**Responsibilities**:
- Per-source HTML/JSON parsing logic
- Selector mappings for extracting fields
- Custom navigation flows (pagination, modals)
- Validation rules for extracted data

**Structure**:
```
src/adapters/
├── broadway.ts      # Broadway Macau Theatre
├── galaxy.ts        # Galaxy Arena/GICC
├── mgto.ts          # MGTO Events Calendar
├── timable.ts       # Timable HK/MO
├── venetian.ts      # Venetian Cotai Arena
└── base-adapter.ts  # Abstract base class
```

#### 4. Data Pipeline (`src/services/scraping/pipeline.ts`)

**Responsibilities**:
- Field normalization (dates to UTC, price to HKD)
- Deduplication via primary/secondary/tertiary matching
- Classification (event/attraction/invalid)
- Image download and optimization
- Database upsert with revision tracking

**Flow**:
```
Raw HTML/JSON
  → Parse (adapter-specific)
  → Normalize (UTC dates, price currency)
  → Classify (event/attraction/invalid)
  → Deduplicate (fuzzy matching)
  → Download images (ETag-aware)
  → Optimize images (resize, WebP, strip metadata)
  → Upsert to database (with revision diff)
  → Cache in Redis (4-hour TTL)
```

#### 5. Circuit Breaker (`src/services/scraping/circuit-breaker.ts`)

**Responsibilities**:
- Track failures per source with sliding window
- Open circuit after threshold (3 consecutive failures within 2h)
- Hold for 1 hour, then half-open (single probe)
- Close on successful probe, reopen on probe failure

**States**:
```typescript
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

class CircuitBreaker {
  private state: Map<string, CircuitState> = new Map();
  private failures: Map<string, number[]> = new Map(); // timestamps
  private openUntil: Map<string, Date> = new Map();

  async execute<T>(source: string, fn: () => Promise<T>): Promise<T> {
    if (this.isOpen(source)) {
      throw new Error(`Circuit open for ${source}`);
    }
    try {
      const result = await fn();
      this.recordSuccess(source);
      return result;
    } catch (error) {
      this.recordFailure(source);
      throw error;
    }
  }
}
```

#### 6. Monitoring Dashboard (`src/pages/admin/scraping-monitor.tsx`)

**Responsibilities**:
- Real-time run list (via Supabase realtime)
- Per-source sparklines (Chart.js or Recharts)
- Engine breakdown pie chart
- Failure reasons table with filters
- Circuit breaker state indicators
- Manual trigger buttons per source

**Metrics**:
- Events scraped (last 24h, 7d, 30d)
- Field coverage % per source
- Engine usage distribution
- Error rate by source and reason
- p95 extraction time
- Last success timestamp

### Configuration Files

#### `config/sources.json`

```json
{
  "sources": [
    {
      "id": "mgto",
      "name": "MGTO Events Calendar",
      "url": "https://www.macaotourism.gov.mo/en/events",
      "priority": 1,
      "schedule": "*/2",
      "engine": "firecrawl",
      "fallback": "devtools",
      "rateLimit": 1.0,
      "timeout": 90000
    },
    {
      "id": "broadway",
      "name": "Broadway Macau Theatre",
      "url": "https://www.broadwaymacau.com.mo/upcoming-events-and-concerts/",
      "priority": 1,
      "schedule": "*/2",
      "engine": "devtools",
      "capture": "xhr-first",
      "scroll": false,
      "maxScrolls": 4,
      "rateLimit": 0.5,
      "timeout": 150000
    },
    {
      "id": "timable",
      "name": "Timable HK/MO",
      "url": "https://timable.com/en/search/event?c=macau",
      "priority": 2,
      "schedule": "*/4",
      "engine": "devtools",
      "capture": "xhr-first",
      "scroll": true,
      "maxScrolls": 6,
      "rateLimit": 0.5,
      "timeout": 180000
    }
  ]
}
```

#### `.github/workflows/ingest-events.yml`

```yaml
name: Ingest Events (every 4h)

on:
  schedule:
    - cron: "0 */4 * * *"
  workflow_dispatch:

jobs:
  ingest:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run orchestrator
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          FIRECRAWL_API_KEY: ${{ secrets.FIRECRAWL_API_KEY }}
          EVENTBRITE_API_KEY: ${{ secrets.EVENTBRITE_API_KEY }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
        run: node dist/scripts/ingest.js --config config/sources.json

      - name: Upload artifacts on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: scraping-logs-${{ github.run_id }}
          path: logs/
          retention-days: 7
```

### Database Schema Extensions

```sql
-- Event revisions for tracking changes
CREATE TABLE event_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  field_name TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  changed_by TEXT DEFAULT 'scraper',
  INDEX idx_event_revisions_event_id (event_id),
  INDEX idx_event_revisions_changed_at (changed_at DESC)
);

-- Scraping runs for monitoring
CREATE TABLE scraping_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'timeout')),
  engine TEXT NOT NULL CHECK (engine IN ('firecrawl', 'devtools', 'playwright', 'api', 'feed')),
  events_found INT DEFAULT 0,
  events_new INT DEFAULT 0,
  events_updated INT DEFAULT 0,
  fields_covered DECIMAL(5,2),
  duration_ms INT,
  error_message TEXT,
  INDEX idx_scraping_runs_source (source_id, started_at DESC),
  INDEX idx_scraping_runs_status (status, started_at DESC)
);

-- Scraping logs for detailed debugging
CREATE TABLE scraping_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES scraping_runs(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  metadata JSONB,
  INDEX idx_scraping_logs_run_id (run_id, logged_at DESC),
  INDEX idx_scraping_logs_level (level, logged_at DESC)
);

-- Circuit breaker state
CREATE TABLE circuit_breaker_state (
  source_id TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  failure_count INT DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  open_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Testing Strategy

### Unit Tests

- **Tool Selector**: Test fallback logic, escalation triggers, auto-promotion
- **Deduplication**: Verify fuzzy matching accuracy, hash stability
- **Circuit Breaker**: State transitions, timing, failure counting
- **Data Normalization**: Date parsing, timezone conversion, price formatting

### Integration Tests

- **Source Adapters**: Mock HTML/JSON responses, verify field extraction
- **Pipeline**: End-to-end flow from raw HTML to database upsert
- **API Endpoints**: Test monitoring dashboard data fetching

### E2E Tests

- **Full Scraping Run**: Execute orchestrator against test sources
- **Error Scenarios**: Simulate timeouts, HTTP errors, malformed HTML
- **Circuit Breaker**: Trigger failures, verify alerts and state changes

### Performance Tests

- **Load Testing**: Scrape 15 sources concurrently, measure duration
- **Database Throughput**: Bulk insert 1000 events, measure time
- **Image Optimization**: Process 100 images, verify sizes and quality

### Manual QA Checklist

- [ ] Verify event data accuracy for 10 random events per source
- [ ] Confirm deduplication merges identical events across sources
- [ ] Test circuit breaker manually opens/closes on failures
- [ ] Validate Slack alerts deliver within 1 minute
- [ ] Check dashboard loads in <2s with 1000+ scraping runs

## Rollout Plan

### Phase 1: Foundation (Weeks 1-2)

**Week 1**:
- [ ] Day 1-2: Orchestrator framework, tool selector, circuit breaker
- [ ] Day 3-4: Firecrawl integration, Chrome DevTools MCP setup
- [ ] Day 5: MGTO adapter (Priority 1, simplest source)

**Week 2**:
- [ ] Day 1-2: Broadway Macau adapter (DevTools MCP, XHR capture)
- [ ] Day 3: Galaxy Arena adapter
- [ ] Day 4: Venetian + Londoner adapters
- [ ] Day 5: Timable adapter (scroll handling, pagination)

**Milestone**: 6 Priority 1 sources operational, >85% field coverage, unit tests passing

### Phase 2: Quality & Monitoring (Weeks 3-4)

**Week 3**:
- [ ] Day 1-2: Deduplication engine (fuzzy matching, merge logic)
- [ ] Day 3: Event classification rules
- [ ] Day 4: Image optimization pipeline
- [ ] Day 5: Revision tracking system

**Week 4**:
- [ ] Day 1-2: Monitoring dashboard UI
- [ ] Day 3: Slack + email alerting
- [ ] Day 4: Integration tests, E2E tests
- [ ] Day 5: Performance testing, optimization

**Milestone**: Data quality controls active, monitoring operational, test coverage >80%

### Phase 3: Expansion (Weeks 5-6)

**Week 5**:
- [ ] Day 1-3: Priority 2 sources (Studio City, MGM, AsiaWorld, HK Coliseum)
- [ ] Day 4-5: Priority 3 sources (MICE, Wynn, Sands, West Kowloon, Eventbrite)

**Week 6**:
- [ ] Day 1-2: Production deployment, GitHub Actions setup
- [ ] Day 3: Monitoring review, alert tuning
- [ ] Day 4: Documentation (runbook, adapter guide)
- [ ] Day 5: Launch readiness review, stakeholder demo

**Milestone**: All 15 Phase 1 sources live, 99%+ success rate over 48 hours, documentation complete

### Success Gates

**Gate 1 (End of Week 2)**:
- Priority 1 sources working with >85% coverage
- Circuit breaker functional
- Go/No-Go: Proceed to Phase 2

**Gate 2 (End of Week 4)**:
- Monitoring dashboard deployed
- Deduplication <5% error rate
- Go/No-Go: Proceed to Phase 3

**Gate 3 (End of Week 6)**:
- All sources operational
- 99%+ uptime over 48 hours
- Launch approval

## Open Questions

1. **~~Redis vs Database Queue~~**: **RESOLVED** → No Redis in Phase 1. GitHub Actions + in-process orchestration sufficient for 15 sources at 2-4h intervals.

2. **Image Storage**: S3 vs Supabase Storage? S3 requires AWS account, Supabase Storage simpler but less mature.
   - **Recommendation**: Use Supabase Storage initially, migrate to S3 if storage limits exceeded

3. **CDN**: Cloudflare (free tier, simpler) vs CloudFront (better S3 integration)?
   - **Recommendation**: Cloudflare for simplicity unless using S3, then CloudFront

4. **Admin Dashboard Auth**: Reuse existing auth system or separate admin credentials?
   - **Recommendation**: Reuse existing auth with admin role check for consistency

5. **Scraping Budget**: What's acceptable monthly cost for GitHub Actions + Storage?
   - **Recommendation**: Target <$100/month, monitor usage weekly, optimize if approaching limit

6. **ML Classification**: Should Phase 1 include ML model training or only rule-based?
   - **Recommendation**: Rule-based for Phase 1, collect labeled data for ML in Phase 2

7. **Timezone Handling**: Store all times in UTC and convert to local in frontend, or store local + timezone?
   - **Recommendation**: Store UTC (`start_at_utc`, `end_at_utc`) + `timezone` field, convert in frontend

8. **Rate Limiting**: Should we implement per-IP rate limiting or only per-domain?
   - **Recommendation**: Per-domain sufficient for Phase 1, GitHub Actions uses shared IPs

## Next Steps

1. **PRD Review**: Circulate to stakeholders (PM, Engineering, Legal) for feedback
2. **Legal Clearance**: Complete ToS review for all 15 sources (1 week)
3. **Epic Creation**: Run `/pm:prd-parse scraping-mcp-enhancement` to generate implementation epic
4. **Task Decomposition**: Run `/pm:epic-decompose scraping-mcp-enhancement` to break into tasks
5. **GitHub Sync**: Run `/pm:epic-sync scraping-mcp-enhancement` to create issues
6. **Kickoff Meeting**: Schedule with team to assign tasks and set milestones
7. **Development Start**: Begin Week 1 tasks (orchestrator, tool selector, MGTO adapter)

---

**Document Control**:
- **Created**: 2025-09-30T14:56:38Z
- **Author**: Product Team
- **Reviewers**: Engineering, Legal, DevOps
- **Version**: 1.0
- **Status**: Backlog (pending review)