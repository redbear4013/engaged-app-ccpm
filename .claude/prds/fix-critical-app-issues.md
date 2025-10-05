---
name: fix-critical-app-issues
description: Fix critical bugs in calendar API, auth security, event scraping quality, and database operations
status: backlog
created: 2025-10-05T12:59:16Z
---

# PRD: Fix Critical App Issues

## Executive Summary

The Engaged App is experiencing multiple critical issues that prevent users from properly discovering, saving, and managing events. These issues span across the calendar system, authentication security, event scraping data quality, and database operations. This PRD addresses the immediate blockers preventing the app from functioning correctly in production.

**Primary Goal:** Resolve all critical bugs preventing core user workflows (browse events → save events → view calendar → manage saved events)

**Timeline:** High priority - blocking production launch

## Problem Statement

### Why This Matters Now

The app has a sophisticated scraping infrastructure but is experiencing critical failures in core user journeys:

1. **Event Data Quality Crisis**: Scraped "events" include navigation menus, static content, and non-event items, making the AI matching feature unusable
2. **Calendar System Failure**: Calendar API returning 400 errors, preventing users from viewing their saved events
3. **Event Saving Broken**: Users cannot save events they're interested in (database errors on swipe)
4. **Security Vulnerabilities**: Auth implementation uses insecure `getSession()` exposing the app to session hijacking
5. **Missing Regional Content**: No Macau events despite having Macau-focused scrapers

### Current Impact

- **User Experience**: Completely broken - users see invalid content and cannot interact with real events
- **Production Readiness**: Not deployable in current state
- **Data Quality**: Database polluted with invalid "events" that need cleanup
- **Security Risk**: Authentication vulnerabilities expose user data

## User Stories

### Primary User Personas

**Sarah - Event Enthusiast**
- Wants to discover concerts, shows, and cultural events in Macau and Hong Kong
- Expects to see actual events with valid dates, venues, and ticket information
- Needs to save events to her calendar and set reminders

**Michael - Business Traveler**
- Visiting Macau for MICE events and conferences
- Needs reliable calendar integration to avoid scheduling conflicts
- Expects professional, accurate event information

### Detailed User Journeys

#### Journey 1: Event Discovery & Matching (BROKEN)

**Current State:**
```
User opens AI Match →
Sees navigation links labeled as "events" →
Swipes right (interested) →
Error: "Error saving event: {}" →
Event not saved → ❌ FAILURE
```

**Expected State:**
```
User opens AI Match →
Sees real events (concerts, shows, conferences) →
Swipes right (interested) →
Event saved successfully →
Appears in calendar → ✅ SUCCESS
```

#### Journey 2: Calendar Management (BROKEN)

**Current State:**
```
User navigates to /calendar →
API returns 400 Bad Request →
Empty calendar shown →
No saved events visible → ❌ FAILURE
```

**Expected State:**
```
User navigates to /calendar →
API returns saved events →
Events displayed in calendar grid →
User can manage and edit events → ✅ SUCCESS
```

#### Journey 3: Regional Event Discovery (BROKEN)

**Current State:**
```
User filters for Macau events →
No results found →
Only fallback mock data (Hong Kong) → ❌ FAILURE
```

**Expected State:**
```
User filters for Macau events →
Sees actual scraped events from MGTO, Broadway, Galaxy →
Can browse by venue and category → ✅ SUCCESS
```

## Requirements

### Functional Requirements

#### FR1: Event Scraping Quality Control

**Critical - Must Implement:**

1. **Event Classification System**
   - Implement the `event_type` field validation: `event | attraction | invalid`
   - Filter out navigation menus, static pages, and non-event content
   - Use title validation rules from SCRAPING_WORKFLOW_EXPORT.md:
     - Exclude titles containing: "Home", "About", "Contact", "Menu", "Navigation"
     - Require minimum title length (10+ characters)
     - Validate presence of event-specific keywords

2. **Date Validation Enforcement**
   - Enforce date range: 60 days past to 2 years future
   - Reject events without valid dates
   - Parse dates using the advanced date parsing system in `universal-scraper.ts`

3. **Content Filtering Rules**
   ```typescript
   // Must implement these validation rules
   - title: min 10 chars, no navigation keywords
   - description: min 50 chars (or null if unavailable)
   - start_time: valid ISO date within range
   - venue: actual venue name (not "N/A" or "TBD")
   - categories: at least one valid category
   ```

4. **Multi-Strategy Extraction Priority**
   - Use extraction strategies in this order:
     1. JSON-LD structured data
     2. Schema.org microdata
     3. OpenGraph meta tags
     4. CSS selector patterns (event-specific)
     5. Pattern recognition (only as fallback)

5. **Database Cleanup Job**
   - Create migration to mark invalid events: `UPDATE events SET event_type = 'invalid' WHERE ...`
   - Add cleanup script: `npm run cleanup:invalid-events`
   - Remove duplicate events by source_id

#### FR2: Calendar API Fixes

**Critical - Must Fix:**

1. **Fix /api/calendar/events Endpoint**
   - Investigate 400 error root cause
   - Add proper error handling and logging
   - Validate authentication middleware
   - Return meaningful error messages

2. **Request Validation**
   ```typescript
   // Add request schema validation
   interface CalendarEventsRequest {
     userId: string    // Required, validated
     startDate?: string // Optional, ISO format
     endDate?: string   // Optional, ISO format
     view?: 'month' | 'week' | 'day' | 'agenda'
   }
   ```

3. **Response Normalization**
   - Ensure consistent response format
   - Include error details in responses
   - Add request logging for debugging

#### FR3: Event Saving Database Fix

**Critical - Must Fix:**

1. **Enhanced Error Handling**
   - ✅ Already improved with detailed error logging
   - Add user-friendly error messages
   - Implement retry logic for transient failures

2. **Database Constraint Investigation**
   - Check if `user_events` table exists and is accessible
   - Verify foreign key constraints (user_id, event_id)
   - Test upsert conflict resolution
   - Validate RLS policies

3. **User Feedback**
   - Show toast notifications on save success/failure
   - Provide actionable error messages to users
   - Add loading states during save operations

#### FR4: Authentication Security

**High Priority:**

1. **Replace getSession() with getUser()**
   - Audit all uses of `supabase.auth.getSession()`
   - Replace with `supabase.auth.getUser()` for server-side auth
   - Update authentication flow in:
     - `src/lib/supabase/client.ts`
     - `src/lib/supabase/server.ts`
     - `src/hooks/use-auth.ts`

2. **Session Validation**
   - Always validate sessions server-side
   - Implement proper JWT verification
   - Add session refresh logic

#### FR5: Macau Events Population

**Medium Priority:**

1. **Run Event Scrapers**
   ```bash
   # Execute these commands to populate database
   npm run scrape:macau
   # Or test individual sources
   npm run scrape:macau -- --source=broadway
   npm run scrape:macau -- --source=mgto
   ```

2. **Verify Scraper Configuration**
   - Check `USE_UNIVERSAL_SCRAPER` env variable
   - Verify source configurations in database
   - Test universal scraper against Macau sources

3. **Data Validation**
   - Run cleanup after scraping
   - Verify event_type classification
   - Check image URLs are valid

### Non-Functional Requirements

#### NFR1: Data Quality Standards

- **Event Quality Score**: 95%+ of scraped items must be actual events (not navigation)
- **Date Accuracy**: 100% of events must have valid dates within allowed range
- **Image Quality**: 80%+ of events must have valid image URLs

#### NFR2: Performance

- **Calendar API Response Time**: < 500ms for month view
- **Event Save Operation**: < 1s for user feedback
- **Database Cleanup**: < 5 minutes for invalid event removal

#### NFR3: Security

- **Authentication**: Zero use of insecure `getSession()` on server-side
- **Session Validation**: All API routes must validate user sessions
- **Error Messages**: No exposure of sensitive database details to clients

#### NFR4: Reliability

- **API Uptime**: 99.9% uptime for calendar endpoints
- **Error Recovery**: Graceful fallback for scraper failures
- **Data Integrity**: No duplicate events in database

## Success Criteria

### Measurable Outcomes

1. **Event Quality Metrics**
   - ✅ Zero navigation menus in events table
   - ✅ 95%+ events have valid dates
   - ✅ 90%+ events have venue information
   - ✅ 80%+ events have images

2. **User Workflow Completion**
   - ✅ Users can browse real events (not navigation)
   - ✅ Users can save events without errors
   - ✅ Saved events appear in calendar
   - ✅ Calendar API returns 200 status code

3. **Security Compliance**
   - ✅ Zero warnings about insecure getSession() usage
   - ✅ All server-side routes use getUser()
   - ✅ Session validation on all protected routes

4. **Regional Content**
   - ✅ At least 50 Macau events in database
   - ✅ Events from 3+ Macau sources (MGTO, Broadway, Galaxy)
   - ✅ Mix of event types (shows, concerts, MICE, attractions)

### Key Performance Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| Event Save Success Rate | > 95% | Monitor database insert success |
| Calendar API Error Rate | < 1% | Track 400/500 errors |
| Invalid Event Ratio | < 5% | Count invalid vs total events |
| User Complaint Rate | 0 | Monitor support tickets |

## Technical Implementation

### Phase 1: Emergency Fixes (Day 1-2)

**Priority 1: Database & API**
1. Fix calendar API 400 errors
2. Fix event saving database errors
3. Add comprehensive error logging
4. Deploy fixes to production

**Deliverables:**
- Working calendar API
- Successful event saves
- Detailed error logs for debugging

### Phase 2: Data Quality (Day 3-5)

**Priority 2: Scraping Quality**
1. Implement event classification system
2. Add content validation rules
3. Run database cleanup for invalid events
4. Re-scrape with improved validation

**Deliverables:**
- Clean events database (only real events)
- Event classification working
- Validation rules enforced

### Phase 3: Security & Polish (Day 6-7)

**Priority 3: Security & UX**
1. Replace getSession() with getUser()
2. Add user-friendly error messages
3. Implement toast notifications
4. Performance optimization

**Deliverables:**
- Secure authentication
- Better UX for errors
- Faster API responses

## Constraints & Assumptions

### Technical Constraints

1. **Database Schema**: Must work with existing Supabase schema
2. **Scraper Architecture**: Use existing universal scraper system
3. **Browser Automation**: Playwright already configured
4. **Rate Limits**: Respect existing rate limits (0.5-1 req/sec)

### Assumptions

1. Supabase database is accessible and migrations are applied
2. Environment variables are properly configured
3. Playwright can access target websites
4. Event sources (MGTO, Broadway, etc.) are still scrapable

### Resource Limitations

- **Timeline**: 7 days maximum for all fixes
- **Testing**: Must test with real scraped data
- **Rollback**: Must be able to revert changes if issues occur

## Out of Scope

### Explicitly NOT Building

1. **New Features**: No new features, only bug fixes
2. **UI Redesign**: Keep existing UI, only fix functionality
3. **AI Improvements**: AI matching algorithm stays as-is
4. **Payment Integration**: Stripe integration not part of this fix
5. **Mobile App**: Web app only, no native mobile work
6. **Analytics Dashboard**: Performance tracking out of scope
7. **Email Notifications**: User notifications not in scope
8. **Social Features**: Sharing/invites not included

### Future Enhancements (Separate PRDs)

- Enhanced AI event recommendations
- Real-time event updates
- Multi-language support
- Advanced image recognition
- User event creation (organizer portal)

## Dependencies

### External Dependencies

1. **Supabase**: Database and authentication service
   - Status: Active
   - Risk: Medium (third-party service)

2. **Event Source Websites**: MGTO, Broadway, Galaxy, etc.
   - Status: Accessible
   - Risk: High (can change structure)

3. **Playwright**: Browser automation
   - Status: Installed and configured
   - Risk: Low

### Internal Dependencies

1. **Database Migrations**: All migrations must be applied
   - Required: `20250101000001_initial_schema.sql` through latest
   - Action: Verify migrations in Supabase dashboard

2. **Environment Configuration**: `.env.local` must be complete
   - Required: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
   - Action: Validate environment variables

3. **Development Server**: Must be running for testing
   - Required: `npm run dev` on port 3000
   - Action: Keep server running during development

## Testing Strategy

### Unit Tests

```typescript
// Event validation tests
describe('Event Validation', () => {
  it('should reject navigation menu items', () => {
    const navigationEvent = {
      title: 'Home - Main Menu',
      description: 'Navigate to home page'
    }
    expect(isValidEvent(navigationEvent)).toBe(false)
  })

  it('should accept real events', () => {
    const realEvent = {
      title: 'Jazz Concert at The Londoner',
      description: 'Live jazz performance featuring...',
      start: '2025-10-15T20:00:00Z',
      venue: 'The Londoner Macao'
    }
    expect(isValidEvent(realEvent)).toBe(true)
  })
})
```

### Integration Tests

1. **Calendar API Tests**
   ```bash
   # Test calendar endpoint
   curl http://localhost:3000/api/calendar/events \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json"

   # Expected: 200 OK with events array
   ```

2. **Event Save Tests**
   ```bash
   # Test event saving
   curl -X POST http://localhost:3000/api/usage/swipe \
     -H "Authorization: Bearer <token>" \
     -d '{"eventId": "123", "action": "interested"}'

   # Expected: 200 OK, event saved to user_events
   ```

3. **Scraper Quality Tests**
   ```bash
   # Run scraper with validation
   npm run scrape:macau -- --source=broadway --validate

   # Expected: Only valid events in output
   ```

### Manual Testing Checklist

- [ ] Browse events in AI Match - see only real events
- [ ] Swipe right on event - saves successfully
- [ ] Check browser console - no error messages
- [ ] Navigate to calendar - events load successfully
- [ ] Check calendar API - returns 200 status
- [ ] Verify Macau events present
- [ ] Test auth security - no getSession warnings
- [ ] Check database - no invalid events
- [ ] Verify images load correctly
- [ ] Test on multiple browsers

## Rollout Plan

### Phase 1: Development (Days 1-5)
- Implement fixes in feature branch
- Write unit tests
- Test locally with real data

### Phase 2: Staging (Days 6)
- Deploy to staging environment
- Run full test suite
- Manual QA testing
- Performance testing

### Phase 3: Production (Day 7)
- Deploy to production
- Monitor error rates
- Rollback plan ready
- User communication

## Risk Mitigation

### High Risk Items

1. **Database Corruption**
   - Risk: Cleanup script deletes valid events
   - Mitigation: Dry-run mode first, backup before cleanup

2. **Scraper Breaking Changes**
   - Risk: Website changes break scrapers
   - Mitigation: Fallback to universal scraper, graceful degradation

3. **Session Migration Issues**
   - Risk: Auth changes break existing sessions
   - Mitigation: Gradual rollout, session refresh logic

### Rollback Strategy

```bash
# Emergency rollback procedure
git revert <commit-hash>
git push origin main --force
npm run db:rollback  # Restore database state
```

## Appendix

### Relevant Documentation

- [SCRAPING_WORKFLOW_EXPORT.md](../../../SCRAPING_WORKFLOW_EXPORT.md) - Scraping rules and validation
- [Supabase Setup Instructions](../../../supabase-setup-instructions.md)
- [Calendar Implementation](../../../todo.md) - Calendar infrastructure docs

### Related Issues

- Issue #13: Core Infrastructure & Orchestrator
- Issue #14: Database Schema & Supabase Setup
- Issue #15: Priority 1 Source Adapters
- Issue #20: Testing & Quality Assurance

### Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-10-05 | Fix critical bugs before new features | Production blockers must be resolved first |
| 2025-10-05 | Use existing scraper architecture | Avoid rewriting working systems |
| 2025-10-05 | Implement event classification | Required for data quality |
| 2025-10-05 | Priority: Calendar > Auth > Scraping | Based on user impact severity |

---

**Document Status:** Ready for Implementation
**Next Steps:** Run `/pm:prd-parse fix-critical-app-issues` to create implementation epic
