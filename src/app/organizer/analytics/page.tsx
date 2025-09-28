'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Calendar,
  ArrowLeft,
  Download,
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  Users,
  Target,
  Award,
  Clock,
} from 'lucide-react';
import { OrganizerService } from '@/services/organizer-service';
import { OrganizerStats, OrganizerEvent } from '@/types/organizer';
import { EventAnalytics } from '@/components/organizer/event-analytics';
import Link from 'next/link';

interface AnalyticsSummary {
  totalEvents: number;
  totalViews: number;
  totalSaves: number;
  totalRsvps: number;
  averageEngagement: number;
  topPerformingEvent: OrganizerEvent | null;
  recentEvents: OrganizerEvent[];
}

export default function OrganizerAnalytics() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [organizerId, setOrganizerId] = useState<string | null>(null);
  const [stats, setStats] = useState<OrganizerStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth?redirect=/organizer/analytics');
      return;
    }

    if (isAuthenticated && user?.id) {
      loadOrganizerProfile();
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (organizerId) {
      loadAnalytics();
    }
  }, [organizerId, timeRange]);

  const loadOrganizerProfile = async () => {
    if (!user?.id) return;

    const { organizer, error } = await OrganizerService.getOrganizerByUserId(user.id);

    if (error || !organizer) {
      router.push('/organizer/create');
      return;
    }

    setOrganizerId(organizer.id);
  };

  const loadAnalytics = async () => {
    if (!organizerId) return;

    try {
      setLoading(true);
      setError(null);

      // Load organizer stats
      const { stats: statsData, error: statsError } =
        await OrganizerService.getOrganizerStats(organizerId);

      if (statsError) {
        throw new Error(statsError);
      }

      setStats(statsData);

      // Load recent events for analytics
      const { events, error: eventsError } =
        await OrganizerService.getOrganizerEvents(
          organizerId,
          { status: ['published', 'approved'], sortBy: 'views' },
          1,
          10
        );

      if (eventsError) {
        throw new Error(eventsError);
      }

      // Create analytics summary
      const analyticsData: AnalyticsSummary = {
        totalEvents: statsData?.totalEvents || 0,
        totalViews: statsData?.totalViews || 0,
        totalSaves: statsData?.totalSaves || 0,
        totalRsvps: statsData?.totalRsvps || 0,
        averageEngagement: statsData?.averageEngagement || 0,
        topPerformingEvent: events.length > 0 ? events[0] : null,
        recentEvents: events.slice(0, 5),
      };

      setAnalytics(analyticsData);

      // Auto-select top performing event for detailed view
      if (events.length > 0 && !selectedEventId) {
        setSelectedEventId(events[0].id);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getGrowthIndicator = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, isPositive: current > 0 };
    const growth = ((current - previous) / previous) * 100;
    return { value: Math.abs(growth), isPositive: growth >= 0 };
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Analytics</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadAnalytics}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!organizerId || !stats || !analytics) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <div className="flex items-center mb-2">
                <Link
                  href="/organizer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 mr-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
              <p className="text-gray-600 mt-1">
                Insights and performance metrics for your events
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
                <option value="quarter">Last 3 months</option>
                <option value="year">Last year</option>
              </select>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalEvents}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">+12%</span>
              <span className="text-gray-600 ml-1">vs last period</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.totalViews)}</p>
              </div>
              <Eye className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">+18%</span>
              <span className="text-gray-600 ml-1">vs last period</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Saves</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.totalSaves)}</p>
              </div>
              <Heart className="h-8 w-8 text-red-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">+25%</span>
              <span className="text-gray-600 ml-1">vs last period</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total RSVPs</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.totalRsvps)}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">+15%</span>
              <span className="text-gray-600 ml-1">vs last period</span>
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Performance Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-semibold text-gray-900">
                    {analytics.averageEngagement.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600">Avg Engagement Rate</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Award className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.publishedEvents}
                  </p>
                  <p className="text-sm text-gray-600">Published Events</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.pendingEvents}
                  </p>
                  <p className="text-sm text-gray-600">Pending Review</p>
                </div>
              </div>

              {/* Engagement Trends Chart Placeholder */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Engagement Trends</h3>
                <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                    <p>Engagement chart will be displayed here</p>
                    <p className="text-sm">Data visualization coming soon</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Top Performing Event */}
            {analytics.topPerformingEvent && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Top Performing Event</h2>
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900">
                    {analytics.topPerformingEvent.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {analytics.topPerformingEvent.startTime.toLocaleDateString()}
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Views</p>
                      <p className="font-semibold">{analytics.topPerformingEvent.views || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">RSVPs</p>
                      <p className="font-semibold">{analytics.topPerformingEvent.rsvps || 0}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEventId(analytics.topPerformingEvent!.id)}
                    className="w-full mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View Detailed Analytics
                  </button>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  href="/organizer/events/new"
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Create New Event
                </Link>
                <Link
                  href="/organizer/events"
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Manage Events
                </Link>
                <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  Export All Data
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Events Performance */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Events Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saves
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RSVPs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Engagement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.recentEvents.map((event) => {
                  const engagementRate = event.views ? ((event.saves || 0) / event.views) * 100 : 0;
                  return (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{event.title}</div>
                          <div className="text-sm text-gray-500">{event.customLocation}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.startTime.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.views || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.saves || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.rsvps || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {engagementRate.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => setSelectedEventId(event.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Event Analytics */}
        {selectedEventId && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Detailed Event Analytics</h2>
              <button
                onClick={() => setSelectedEventId(null)}
                className="text-gray-600 hover:text-gray-900"
              >
                Hide Details
              </button>
            </div>
            <EventAnalytics eventId={selectedEventId} organizerId={organizerId} />
          </div>
        )}
      </div>
    </div>
  );
}