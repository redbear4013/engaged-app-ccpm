---
name: event-calendar-app
status: backlog
created: 2025-09-21T14:44:30Z
progress: 0%
prd: .claude/prds/event-calendar-app.md
github: https://github.com/redbear4013/engaged-app-ccpm/issues/1
---

# Epic: event-calendar-app

## Overview
Build a local event discovery and calendar platform for Macau/HK/GBA using Next.js and Supabase. The implementation focuses on three core pillars: discover-first UX (inspired by Timable), AI-powered swipe matching, and calendar-first event management. The architecture leverages modern web technologies with automated scraping pipelines and real-time personalization.

## Architecture Decisions
- **Frontend**: Next.js 14 with App Router for SSR/SEO optimization and responsive design
- **Backend**: Supabase with PostgreSQL, Row Level Security, and real-time subscriptions
- **Authentication**: Supabase Auth with JWT tokens and social login options
- **Scraping Pipeline**: Playwright + Firecrawl with ETag-based change detection and deduplication
- **AI Matching**: Simple preference scoring algorithm with user feedback loops
- **Payments**: Stripe integration for Pro membership (HKD 38/month)
- **State Management**: React Query + Zustand for client-side state and caching
- **UI Framework**: Tailwind CSS with Shadcn/ui components for rapid development

## Technical Approach

### Frontend Components
- **Landing/Discover Page**: Server-rendered sections (Trending, Nearby, Top 10) with infinite scroll
- **AI Matching Interface**: Swipe deck component with gesture detection and smooth animations
- **Calendar Views**: Month/Week/Agenda components with conflict detection and color coding
- **Event Detail Modal**: Overlay with full event information, save/share functionality
- **Membership Flow**: Pricing comparison and Stripe checkout integration
- **Organizer Portal**: Event submission forms with image upload and preview

### Backend Services
- **Event API**: CRUD operations with filtering, search, and recommendation endpoints
- **User Management**: Profile management, preferences, and swipe history tracking
- **Scraping Service**: Automated pipeline with job queues and error handling
- **AI Matching Engine**: Preference scoring based on user interactions and event metadata
- **Notification System**: Email alerts for Pro users and event updates
- **Analytics**: User engagement tracking and business metrics collection

### Infrastructure
- **Deployment**: Vercel for frontend with edge functions and CDN
- **Database**: Supabase PostgreSQL with automated backups and real-time sync
- **File Storage**: Supabase Storage for event images and user uploads
- **Monitoring**: Supabase dashboard + custom analytics for performance tracking
- **Scaling**: Auto-scaling through Supabase and Vercel edge infrastructure

## Implementation Strategy
- **Phase 1**: Core discover page and basic calendar functionality
- **Phase 2**: AI matching system with swipe interface
- **Phase 3**: Pro membership and advanced features
- **Risk Mitigation**: Progressive enhancement, feature flags, and A/B testing
- **Testing**: Component testing with Jest/RTL, E2E with Playwright, manual QA cycles

## Task Breakdown Preview
High-level task categories that will be created:
- [ ] **Database Schema & Supabase Setup**: Tables, RLS policies, authentication configuration
- [ ] **Event Scraping Pipeline**: Playwright automation, data processing, deduplication logic
- [ ] **Discover Landing Page**: Server-rendered sections, event cards, responsive layout
- [ ] **AI Matching Interface**: Swipe deck component, gesture handling, preference tracking
- [ ] **Calendar Integration**: Multi-view calendar, conflict detection, event synchronization
- [ ] **User Authentication & Profiles**: Login flows, profile management, preference settings
- [ ] **Pro Membership System**: Stripe integration, subscription management, feature gating
- [ ] **Organizer Portal**: Event submission forms, approval workflow, dashboard
- [ ] **Performance Optimization**: SEO setup, caching strategies, Core Web Vitals
- [ ] **Testing & Deployment**: Comprehensive test suite, CI/CD pipeline, monitoring setup

## Dependencies
- **External Services**: Supabase backend, Stripe payments, Google Maps API for locations
- **Event Data Sources**: Venue websites, Eventbrite API, manual organizer submissions
- **Design Assets**: UI/UX design completion before frontend implementation
- **Legal Requirements**: Privacy policy and terms of service for user data handling

## Success Criteria (Technical)
- **Performance**: <2s page load times, <500ms search results, 60fps animations
- **Reliability**: 99.9% uptime, graceful error handling, automated failover
- **Scalability**: Support 50k events and 20k users with auto-scaling infrastructure
- **Security**: HTTPS, JWT authentication, RLS policies, data encryption at rest
- **Code Quality**: >90% test coverage, TypeScript strict mode, automated linting

## Tasks Created
- [ ] #2 - Database Schema & Supabase Setup (parallel: true)
- [ ] #3 - Project Setup & Architecture (parallel: true)
- [ ] #4 - User Authentication & Profiles (parallel: false)
- [ ] #5 - Event Scraping Pipeline (parallel: true)
- [ ] #6 - Discover Landing Page (parallel: true)
- [ ] #7 - Calendar Integration (parallel: false)
- [ ] #8 - AI Matching Interface (parallel: true)
- [ ] #9 - Pro Membership System (parallel: true)
- [ ] #10 - Organizer Portal (parallel: true)
- [ ] #11 - Performance Optimization & Deployment (parallel: false)

Total tasks: 10
Parallel tasks: 7
Sequential tasks: 3
Estimated total effort: 240-290 hours

## Estimated Effort
- **Overall Timeline**: 10-12 weeks for MVP (single developer)
- **Critical Path**: Database design → Scraping pipeline → Frontend implementation → Testing
- **Resource Requirements**: 1 full-stack developer, design handoffs, Supabase Pro plan
- **Key Milestones**:
  - Week 4: Core infrastructure and scraping pipeline
  - Week 8: Complete discover and calendar functionality
  - Week 12: AI matching, membership, and production deployment