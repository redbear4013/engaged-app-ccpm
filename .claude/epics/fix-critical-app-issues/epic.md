---
name: fix-critical-app-issues
status: backlog
created: 2025-10-05T15:21:54Z
progress: 0%
prd: .claude/prds/fix-critical-app-issues.md
github: https://github.com/redbear4013/engaged-app-ccpm/issues/23
---

# Epic: Fix Critical App Issues

## Overview

This epic addresses 5 critical production-blocking issues in the Engaged App through targeted fixes to existing systems. We're leveraging the sophisticated scraping infrastructure already in place (universal scraper, content validation) but adding proper enforcement of validation rules. The focus is on fixing broken functionality, not building new features.

**Core Philosophy:** Fix what exists, don't rebuild. Leverage existing validation systems and add missing enforcement.

## Architecture Decisions

### AD-1: Use Existing Universal Scraper Validation System
**Decision:** Enforce the comprehensive validation rules already defined in `universal-scraper.ts` and `SCRAPING_WORKFLOW_EXPORT.md` rather than creating new validation systems.

**Rationale:**
- Universal scraper already has event classification (`event | attraction | invalid`)
- Content validation rules exist but aren't enforced at database insert
- Date parsing utilities already handle complex date formats
- Multi-strategy extraction (JSON-LD → Schema.org → OpenGraph → CSS) already implemented

**Implementation:** Add database-level validation and post-scrape filtering to enforce existing rules.

### AD-2: Fix Calendar API at Source, Not Workaround
**Decision:** Identify and fix the root cause of 400 errors in `/api/calendar/events` rather than adding error handling layers.

**Rationale:**
- Error is consistent (400 Bad Request) suggesting input validation issue
- Proper fix prevents future occurrences
- Better UX than masking errors with fallbacks

**Implementation:** Add comprehensive request logging, identify invalid parameter, fix validation logic.

### AD-3: Enhance Error Logging for Database Operations
**Decision:** Use structured error logging with full error context (already started in `ai-matching-service.ts`).

**Rationale:**
- Empty error objects `{}` hide actual issues
- Supabase errors have rich metadata (message, details, hint, code)
- Developers need actionable error information

**Implementation:** Apply same enhanced logging pattern to all database operations.

### AD-4: Replace getSession() Server-Side Only
**Decision:** Replace `getSession()` with `getUser()` only in server-side code (API routes, server components).

**Rationale:**
- Client-side getSession() is acceptable (documented by Supabase)
- Server-side getSession() is insecure (uses cookies without validation)
- Minimizes changes and risk

**Implementation:** Audit and fix server-side auth calls only, leave client-side unchanged.

### AD-5: Database Cleanup via Soft Delete
**Decision:** Mark invalid events as `event_type = 'invalid'` rather than hard deleting them.

**Rationale:**
- Preserves data for analysis and debugging
- Reversible if classification is wrong
- Allows incremental cleanup and verification

**Implementation:** Update existing `event_type` column (already exists in schema).

## Technical Approach

### Backend Services

#### 1. Event Scraping Quality Control

**Leverage Existing Systems:**
- Universal scraper has all validation logic needed
- Content extraction strategies already prioritized correctly
- Date parsing handles complex formats

**What's Missing:**
- Enforcement at database insert
- Post-scrape filtering of invalid events
- Event classification population

**Changes Required:**
```typescript
// In universal-scraper.ts - already has validation, just enforce it
async function processScrapedEvent(rawEvent: RawEventData) {
  // Existing validation logic (already implemented)
  const validated = await validateEventContent(rawEvent)

  // ADD: Explicit event classification
  const eventType = classifyEvent(validated)

  // ADD: Filter before database insert
  if (eventType === 'invalid') {
    logger.warn('Skipping invalid event', { title: validated.title })
    return null  // Don't insert into database
  }

  // Existing database insert with event_type
  return await insertEvent({ ...validated, event_type: eventType })
}
```

#### 2. Calendar API Fix

**Root Cause Investigation:**
```typescript
// /api/calendar/events/route.ts
// Current error: 400 Bad Request
// Hypothesis: Missing or invalid user authentication

export async function GET(request: Request) {
  // ADD: Comprehensive request logging
  console.log('Calendar API request:', {
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    searchParams: new URL(request.url).searchParams
  })

  // FIX: Use getUser() instead of getSession()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    // ADD: Specific error messages
    return NextResponse.json(
      { error: 'Authentication required', details: error?.message },
      { status: 401 }  // Not 400
    )
  }

  // Existing calendar fetch logic...
}
```

#### 3. Database Operations Enhancement

**Apply Enhanced Logging Pattern:**
```typescript
// Pattern already established in ai-matching-service.ts
// Apply to all database operations

if (error) {
  console.error('Database operation failed:', {
    operation: 'insert_event',
    table: 'user_events',
    error,
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code
  })
  // Provide user-friendly message
  return { success: false, userMessage: 'Failed to save event. Please try again.' }
}
```

#### 4. Authentication Security

**Minimal Changes for Maximum Impact:**
```typescript
// Only change server-side files:
// - src/app/api/**/route.ts
// - src/lib/supabase/server.ts

// BEFORE (insecure):
const { data: { session } } = await supabase.auth.getSession()
const user = session?.user

// AFTER (secure):
const { data: { user }, error } = await supabase.auth.getUser()
```

### Data Management

#### Database Cleanup Strategy

**Phase 1: Identify Invalid Events**
```sql
-- Query to find likely invalid events
SELECT id, title, description, event_type
FROM events
WHERE
  event_type IS NULL  -- Not classified yet
  OR title LIKE '%Home%'
  OR title LIKE '%Menu%'
  OR title LIKE '%Navigation%'
  OR title LIKE '%Contact%'
  OR LENGTH(title) < 10
  OR description IS NULL
  OR LENGTH(description) < 50
  OR start_time IS NULL
LIMIT 100;
```

**Phase 2: Mark as Invalid (Reversible)**
```sql
-- Soft delete - mark as invalid
UPDATE events
SET event_type = 'invalid',
    updated_at = NOW()
WHERE
  (title ILIKE '%home%' OR title ILIKE '%menu%' OR title ILIKE '%navigation%')
  AND event_type != 'invalid';
```

**Phase 3: Filter in Application**
```typescript
// Update all event queries to exclude invalid
.from('events')
.select('*')
.neq('event_type', 'invalid')  // ADD THIS LINE
.eq('status', 'published')
```

### Testing Approach

**Validation Testing:**
```bash
# Test scraper with validation
npm run scrape:test -- --source=broadway --validate

# Expected output:
# ✓ 15 events extracted
# ✓ 15 events validated
# ✗ 3 events rejected (navigation menus)
# ✓ 12 events inserted
```

**API Testing:**
```bash
# Test calendar API
curl -v http://localhost:3000/api/calendar/events \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK (not 400)
```

## Implementation Strategy

### Phase 1: Emergency Fixes (2 days)
**Goal:** Unblock users immediately

**Tasks:**
1. Fix calendar API 400 errors
2. Fix event saving database errors
3. Add comprehensive logging to all API routes

**Success Criteria:**
- Calendar API returns 200 status
- Users can save events without errors
- Error logs show actionable information

### Phase 2: Data Quality (3 days)
**Goal:** Clean database and prevent future pollution

**Tasks:**
4. Enforce event validation in scraper
5. Database cleanup - mark invalid events
6. Update event queries to filter invalid events

**Success Criteria:**
- No navigation menus in AI match feed
- Database has < 5% invalid events
- New scrapes only insert valid events

### Phase 3: Security & Polish (2 days)
**Goal:** Production-ready security and UX

**Tasks:**
7. Replace getSession() with getUser() in server code
8. Add user-friendly error messages and toast notifications
9. Performance testing and optimization

**Success Criteria:**
- Zero getSession() warnings in server logs
- Users see helpful error messages
- API response time < 500ms

## Task Breakdown Preview

**10 Focused Tasks (Maximum Leverage):**

1. **[P0] Fix Calendar API 400 Errors**
   - Add request logging to `/api/calendar/events`
   - Replace getSession() with getUser()
   - Fix authentication validation
   - Test with authenticated requests

2. **[P0] Fix Event Saving Database Errors**
   - Investigate user_events table constraints
   - Verify RLS policies allow inserts
   - Test upsert conflict resolution
   - Add error logging for diagnosis

3. **[P0] Add Comprehensive API Logging**
   - Apply enhanced error logging pattern to all API routes
   - Log request details (headers, params, body)
   - Log database operation results
   - Monitor error rates

4. **[P1] Enforce Event Validation in Scraper**
   - Enable event classification in universal scraper
   - Filter invalid events before database insert
   - Log rejected events with reasons
   - Test with Broadway/MGTO sources

5. **[P1] Database Cleanup - Mark Invalid Events**
   - Create cleanup SQL script
   - Run in dry-run mode first
   - Mark navigation/menu items as invalid
   - Verify correct events preserved

6. **[P1] Filter Invalid Events in Queries**
   - Update loadEvents() in ai-matching-service
   - Add .neq('event_type', 'invalid') to all event queries
   - Test AI match feed shows only real events
   - Verify calendar displays correctly

7. **[P2] Replace getSession() in Server Code**
   - Audit all API route files
   - Replace getSession() with getUser()
   - Test authentication flow
   - Verify session validation works

8. **[P2] Add User-Friendly Error Messages**
   - Create error message constants
   - Map database errors to user messages
   - Implement toast notifications
   - Test error scenarios

9. **[P2] Run Macau Event Scrapers**
   - Configure environment for scraping
   - Test Broadway scraper
   - Test MGTO scraper
   - Verify event quality

10. **[P3] Performance Testing & Monitoring**
    - Benchmark calendar API response time
    - Test with 1000+ events
    - Add performance logging
    - Optimize slow queries

## Dependencies

### External Dependencies
- ✅ Supabase (database accessible)
- ✅ Universal scraper (already implemented)
- ✅ Event validation rules (documented)
- ⚠️ Event source websites (may change structure)

### Internal Dependencies
- ✅ Database migrations applied
- ✅ Enhanced error logging pattern established
- ✅ Event classification column exists (`event_type`)
- ⚠️ Environment variables configured

### Prerequisite Work
- None - all infrastructure exists, just needs fixes

## Success Criteria (Technical)

### Performance Benchmarks
- Calendar API: < 500ms response time (month view with 100 events)
- Event save: < 1s for user feedback
- Database cleanup: < 5 minutes for full scan

### Quality Gates
- **Event Quality**: 95%+ valid events (not navigation/menus)
- **API Success Rate**: 99%+ successful requests (no 400/500 errors)
- **Security**: 0 server-side getSession() usage
- **User Experience**: 0 empty error objects in logs

### Acceptance Criteria
- [ ] Users can browse AI match feed without seeing navigation menus
- [ ] Users can save events by swiping right (no errors)
- [ ] Saved events appear in calendar view
- [ ] Calendar API returns 200 status code
- [ ] At least 50 Macau events in database
- [ ] Zero authentication security warnings in logs
- [ ] Error messages are actionable and user-friendly

## Estimated Effort

### Overall Timeline: 7 days

**Breakdown by Phase:**
- Phase 1 (Emergency): 2 days (Tasks 1-3)
- Phase 2 (Quality): 3 days (Tasks 4-6)
- Phase 3 (Security): 2 days (Tasks 7-10)

### Resource Requirements
- 1 Full-stack Developer
- Access to Supabase dashboard
- Local development environment
- Test data and accounts

### Critical Path Items
1. Fix calendar API (blocks user workflow)
2. Fix event saving (blocks user engagement)
3. Enforce validation (blocks data quality)
4. Database cleanup (blocks production readiness)

### Risk Factors
- **Medium Risk**: Website structure changes breaking scrapers
  - Mitigation: Universal scraper handles variations gracefully

- **Low Risk**: Database cleanup deletes valid events
  - Mitigation: Soft delete (reversible), dry-run testing first

- **Low Risk**: Auth changes break existing sessions
  - Mitigation: Only change server-side, client stays same

## Monitoring & Validation

### During Development
```bash
# Watch server logs
npm run dev | grep -i error

# Monitor API responses
curl http://localhost:3000/api/calendar/events

# Check database quality
SELECT event_type, COUNT(*) FROM events GROUP BY event_type;
```

### Post-Deployment
- Monitor error rates in production logs
- Track event save success rate
- Measure calendar API performance
- Verify event quality metrics

---

## Tasks Created

- [ ] #24 - Fix Calendar API 400 Errors (parallel: true)
- [ ] #25 - Fix Event Saving Database Errors (parallel: true)
- [ ] #26 - Add Comprehensive API Logging (parallel: true)
- [ ] #27 - Enforce Event Validation in Scraper (parallel: true)
- [ ] #28 - Database Cleanup - Mark Invalid Events (parallel: false)
- [ ] #29 - Filter Invalid Events in Queries (parallel: false)
- [ ] #30 - Replace getSession() in Server Code (parallel: true)
- [ ] #31 - Add User-Friendly Error Messages (parallel: true)
- [ ] #32 - Run Macau Event Scrapers (parallel: true)
- [ ] #33 - Performance Testing & Monitoring (parallel: false)

**Total tasks:** 10
**Parallel tasks:** 7
**Sequential tasks:** 3
**Estimated total effort:** 68-94 hours (~2-3 weeks for 1 developer)
---

**Ready for Implementation:** This epic is designed to maximize impact with minimum changes. Each task leverages existing systems and adds missing enforcement.

**Next Step:** Run `/pm:epic-sync fix-critical-app-issues` to sync tasks to GitHub issues.
