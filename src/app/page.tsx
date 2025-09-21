'use client';

import { useAuth } from '@/hooks/use-auth';

export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            Welcome to Engaged
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-600">
            Discover amazing local events in Macau, Hong Kong, and the Greater
            Bay Area. AI-powered matching for your perfect experience.
          </p>

          {isAuthenticated ? (
            <div className="space-y-4">
              <p className="text-lg text-gray-700">
                Welcome back, {user?.fullName || user?.email}!
              </p>
              <div className="flex justify-center gap-4">
                <button className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700">
                  Discover Events
                </button>
                <button className="rounded-lg border border-blue-600 bg-white px-6 py-3 text-blue-600 transition-colors hover:bg-blue-50">
                  My Calendar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-lg text-gray-700">
                Get started by creating an account or signing in.
              </p>
              <div className="flex justify-center gap-4">
                <button className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700">
                  Sign Up
                </button>
                <button className="rounded-lg border border-blue-600 bg-white px-6 py-3 text-blue-600 transition-colors hover:bg-blue-50">
                  Sign In
                </button>
              </div>
            </div>
          )}

          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-3 text-xl font-semibold">Discover</h3>
              <p className="text-gray-600">
                Find events happening near you with our AI-powered
                recommendations.
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-3 text-xl font-semibold">Match</h3>
              <p className="text-gray-600">
                Swipe through events and let our AI learn your preferences.
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-3 text-xl font-semibold">Organize</h3>
              <p className="text-gray-600">
                Keep track of your saved events in a beautiful calendar
                interface.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
