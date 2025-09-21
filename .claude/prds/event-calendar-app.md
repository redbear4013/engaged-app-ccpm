---
name: event-calendar-app
description: Local event discovery and calendar platform with AI matching for Macau/Hong Kong/GBA region
status: backlog
created: 2025-09-18T08:41:18Z
---

# PRD: event-calendar-app

## Executive Summary

The Event Calendar App is a **local event discovery and calendar platform** that helps users find trending, nearby, and top events in Macau/Hong Kong/GBA. Inspired by Timable's proven discover-first model, it differentiates with **AI Matching (swipe feature)**, a **calendar-first UX**, and a **simple Pro membership plan**.

The app aggregates event data from official sources, venue websites, and organizer submissions using a **state-of-the-art scraping pipeline**. Users can easily discover, filter, and save events, while organizers can submit and promote their events through a dedicated portal.

## Problem Statement

**What problem are we solving?**
- **Fragmented discovery**: Events are scattered across multiple sites and apps
- **Generic recommendations**: Users get lists, not personalized matches
- **Weak calendar integration**: Most event apps treat calendars as secondary
- **Organizer friction**: No simple way to submit, update, and promote events

**Why is this important now?**
The post-COVID event landscape has created demand for better discovery tools, especially in the Macau/HK/GBA region where events are highly localized but scattered across multiple platforms.

## User Stories

### Primary User Personas

**1. Event Discoverers (Primary)**
- Young professionals (25-35) in Macau/HK who want to discover local events
- Pain points: Too much time browsing multiple apps, generic recommendations
- Goals: Find relevant events quickly, manage social calendar efficiently

**2. Event Organizers (Secondary)**
- Small to medium event organizers, venues, community groups
- Pain points: Limited promotion channels, manual event posting
- Goals: Reach target audience, manage event updates efficiently

### Detailed User Journeys

**Discover & AI Matching**
- As a user, I can see **Trending, Nearby, and Top 10** events on the home page
- As a user, I can tap **"TRY AI MATCHING"** to swipe on personalized event cards
- As a user, I can save swiped events into my in-app calendar

**Calendar Management**
- As a user, I can view saved events in **Month, Week, Agenda** views
- As a user, I can get conflict warnings if events overlap
- As a Pro user, I get early-bird alerts when new events match my preferences

**Organizer Experience**
- As an organizer, I can **submit events** with title, description, date/time, venue, poster, ticket link
- As an organizer, I can **edit/update** events, with changes notifying users who saved them

## Requirements

### Functional Requirements

**FR1: Discover Landing Page**
- Timable-style sections (Trending, Nearby, Top 10, Weekend Picks)
- Event cards with poster, title, venue, date/time, save button

**FR2: AI Matching**
- Swipe deck with Like/Pass/Superlike actions
- Store user feedback to refine personalization
- Free tier: 40 swipes/day limit

**FR3: Calendar Integration**
- Events added via swipe/bookmark auto-sync to calendar
- Multiple views (month, week, agenda)
- Conflict detection and warnings

**FR4: Membership System**
- Free tier: 40 swipes/day, basic calendar
- Pro tier (HKD 38/month): Unlimited swipes, superlikes, advanced filters, no ads, early alerts

**FR5: Scraping & Organizer Tools**
- Automated pipeline: Playwright + Firecrawl + ETag checks + deduplication
- Organizer portal: manual submission + bulk import (CSV/ICS)
- Event approval workflow

### Non-Functional Requirements

**Performance**
- <2s discover page load time
- <500ms search filter results
- Smooth swipe animations (60fps)

**Scalability**
- Handle 50k events and 20k users
- Auto-scaling infrastructure on Supabase

**Security**
- Supabase Row Level Security (RLS)
- JWT authentication
- HTTPS encryption
- Data privacy compliance (GDPR)

**SEO & Discoverability**
- Server-side rendering for discover sections
- Open Graph meta tags for event sharing
- Search engine optimization

## Success Criteria

**Key Metrics**
- User engagement: >70% weekly retention rate
- Discovery effectiveness: >30% swipe-to-save conversion
- Revenue: 5% conversion to Pro membership within 3 months
- Event coverage: >80% of major venues in target regions

**Measurable Outcomes**
- 10k+ active users within 6 months
- 500+ events per month in database
- Average 3+ events saved per user per month
- <2s average page load times maintained

## Constraints & Assumptions

**Technical Limitations**
- Web-first approach (Next.js + Supabase)
- Dependency on external event sources for scraping
- Limited to Macau/HK/GBA region initially

**Timeline Constraints**
- MVP launch within 3 months
- AI matching algorithm requires 2-4 weeks user data for effectiveness

**Resource Limitations**
- Single developer initially
- Limited marketing budget for user acquisition
- Dependent on organic growth and word-of-mouth

**Key Assumptions**
- Users prefer swipe interface for event discovery
- Calendar-first approach differentiates from competitors
- Pro membership at HKD 38/month provides sufficient revenue

## Out of Scope

**Explicitly NOT building in Phase 1:**
- Native mobile apps (iOS/Android)
- Advanced social features (friend connections, social feeds)
- Event ticketing/payment processing
- Multi-language support beyond English/Chinese
- Google Calendar two-way sync
- Push notifications (Phase 2 feature)
- Event reviews and ratings system
- Advanced analytics dashboard for organizers

## Dependencies

**External Dependencies**
- Supabase backend infrastructure
- Stripe payment processing
- Event venue websites for scraping
- Google Maps API for location services

**Internal Team Dependencies**
- UI/UX design completion before development
- Event data pipeline setup before user testing
- Payment integration before Pro membership launch

## Risks & Mitigation

**Technical Risks**
- Scraping fragility → Multi-source pipeline, fallback logic, change alerts
- AI matching accuracy → Gradual rollout, A/B testing, user feedback loops
- Performance under load → Load testing, auto-scaling, CDN implementation

**Market Risks**
- User adoption challenges → Differentiate with swiping + calendar-first UX
- Organizer adoption → Lower friction with free submission tools
- Competition from established players → Focus on personalization and local expertise

## Implementation Phases

**Phase 1 (MVP - 3 months)**
- ✅ Discover landing page (Trending/Nearby/Top 10)
- ✅ AI Matching MVP
- ✅ Calendar integration with saves/swipes
- ✅ Pro membership flow
- Basic organizer portal

**Phase 2 (6 months)**
- Push notifications
- Google Calendar sync
- Advanced filters and search
- Enhanced organizer tools

**Phase 3 (12 months)**
- Mobile app development
- Social features
- Advanced analytics
- Regional expansion

## Monetization Strategy

**Primary Revenue Stream**
- Pro Membership: HKD 38/month
- Target: 5% conversion rate from free users

**Future Revenue Streams**
- Event promotion placements
- Ticketing partnerships (commission-based)
- Premium organizer tools

## UI/UX Guidelines

**Design Inspiration**
- Timable layout + Any.do minimalism
- Clean white background, blue/gradient accent colors
- Modern sans-serif typography (Inter, Roboto)

**Key Screens**
1. **Discover Page**: Logo, search, trending/nearby/top sections, AI matching CTA
2. **Swipe Deck**: Fullscreen cards with swipe gestures
3. **Event Detail**: Hero image, details, save/share buttons
4. **Calendar**: Month/Week/Agenda views with color coding
5. **Membership**: Free vs Pro comparison, Stripe checkout
6. **Organizer Portal**: Event submission form, dashboard

**Navigation**
- Bottom navigation: Home/Discover, Calendar, Profile
- Clean, intuitive user flows
- Responsive design for mobile-first experience