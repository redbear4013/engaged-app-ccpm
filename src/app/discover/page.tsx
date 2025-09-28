import { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchBar } from '@/components/sections/SearchBar';
import { TrendingEvents } from '@/components/sections/TrendingEvents';
import { TopEvents } from '@/components/sections/TopEvents';
import { NearbyEventsWrapper } from '@/components/sections/NearbyEventsWrapper';
import { getTrendingEvents, getNearbyEvents, getTopEvents } from '@/lib/queries/events';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { generatePageSEO, generateBreadcrumbStructuredData } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';

// SEO metadata for the discover page
export const metadata: Metadata = generatePageSEO({
  title: 'Discover Local Events - Find Events in Macau & Hong Kong',
  description: 'Discover amazing local events in Macau, Hong Kong, and the Greater Bay Area. AI-powered event matching helps you find concerts, festivals, workshops, and more.',
  path: '/discover',
  keywords: ['events discovery', 'Macau events', 'Hong Kong events', 'local events', 'event search', 'concerts', 'festivals', 'workshops'],
});

// This is a server component for SEO optimization
export default async function DiscoverPage() {
  // Default location for SSR (Macau)
  const DEFAULT_LOCATION = {
    latitude: 22.1987,
    longitude: 113.5439,
  };

  // Pre-fetch data on the server for better performance and SEO
  const [trendingEvents, nearbyEvents, topEvents] = await Promise.allSettled([
    getTrendingEvents({ limit: 8 }),
    getNearbyEvents({
      limit: 8,
      userLocation: DEFAULT_LOCATION, // Use default location for SSR
      radius: 50
    }),
    getTopEvents({ limit: 10 }),
  ]);

  const initialTrendingEvents = trendingEvents.status === 'fulfilled' ? trendingEvents.value : [];
  const initialNearbyEvents = nearbyEvents.status === 'fulfilled' ? nearbyEvents.value : [];
  const initialTopEvents = topEvents.status === 'fulfilled' ? topEvents.value : [];

  // Breadcrumb structured data
  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Discover Events', url: '/discover' },
  ]);

  return (
    <>
      <StructuredData data={breadcrumbData} />

      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Discover Amazing
                <span className="block bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  Local Events
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
                Find trending, nearby, and curated events in Macau, Hong Kong, and the Greater Bay Area
              </p>

              {/* Search Bar */}
              <div className="mb-8">
                <SearchBar
                  placeholder="Search events, venues, or organizers..."
                  className="max-w-3xl"
                />
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/ai-match"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  AI Event Matching
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>

                <Link
                  href="/calendar"
                  className="inline-flex items-center px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-all duration-200 backdrop-blur-sm"
                >
                  View Calendar
                </Link>

                <Link
                  href="/categories"
                  className="inline-flex items-center px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-all duration-200 backdrop-blur-sm"
                >
                  Browse Categories
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-16 space-y-16">
          {/* Trending Events Section */}
          <Suspense fallback={<TrendingEventsSkeleton />}>
            <TrendingEvents
              initialEvents={initialTrendingEvents}
              limit={8}
            />
          </Suspense>

          {/* Nearby Events Section */}
          <NearbyEventsWrapper
            initialEvents={initialNearbyEvents}
            limit={8}
            defaultRadius={50}
          />

          {/* Top Events Section */}
          <Suspense fallback={<TopEventsSkeleton />}>
            <TopEvents
              initialEvents={initialTopEvents}
              limit={10}
            />
          </Suspense>

          {/* Call to Action */}
          <section className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Want Personalized Recommendations?
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Try our AI-powered event matching to discover events tailored to your interests, schedule, and location preferences.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/ai-match"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Start AI Matching
              </Link>
              <Link
                href="/auth/signup"
                className="inline-flex items-center px-8 py-4 border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 font-semibold rounded-lg transition-colors"
              >
                Create Free Account
              </Link>
            </div>
          </section>
        </main>

        {/* Footer CTA */}
        <section className="bg-gray-900 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-4">Never Miss an Event Again</h2>
            <p className="text-gray-300 mb-8 max-w-xl mx-auto">
              Get notified about new events, save your favorites, and sync with your calendar.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

// Loading skeletons for better UX
function TrendingEventsSkeleton() {
  return (
    <section className="w-full">
      <div className="flex items-center space-x-2 mb-6">
        <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
        <div className="w-48 h-8 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="bg-gray-200 animate-pulse rounded-xl aspect-[3/4]"
          />
        ))}
      </div>
    </section>
  );
}

function TopEventsSkeleton() {
  return (
    <section className="w-full">
      <div className="flex items-center space-x-2 mb-6">
        <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
        <div className="w-44 h-8 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className="bg-gray-200 animate-pulse rounded-xl aspect-[3/4]"
          />
        ))}
      </div>
    </section>
  );
}