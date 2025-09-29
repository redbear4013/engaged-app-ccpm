'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Calendar,
  PlusCircle,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Send,
  Archive,
  Copy,
  CheckSquare,
  Square,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  XCircle,
  BarChart3,
  ArrowLeft,
} from 'lucide-react';
import { OrganizerService } from '@/services/organizer-service';
import { OrganizerEvent, EventStatus, OrganizerEventFilters, BulkOperation } from '@/types/organizer';
import Link from 'next/link';

interface FilterState extends OrganizerEventFilters {
  showFilters: boolean;
}

function OrganizerEventsContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [organizerId, setOrganizerId] = useState<string | null>(null);
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    showFilters: false,
    search: '',
    status: [],
    sortBy: 'updated',
    sortOrder: 'desc',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,
  });

  // Check for success messages from URL params
  const created = searchParams?.get('created');
  const status = searchParams?.get('status');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (created && status) {
      setShowSuccessMessage(true);
      if (status === 'draft') {
        setSuccessMessage('Event saved as draft successfully! You can edit and submit it for approval when ready.');
      } else if (status === 'pending') {
        setSuccessMessage('Event submitted for approval! We\'ll review it and get back to you soon.');
      }
    }
  }, [created, status]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth?redirect=/organizer/events');
      return;
    }

    if (isAuthenticated && user?.id) {
      loadOrganizerProfile();
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (organizerId) {
      loadEvents();
    }
  }, [organizerId, filters.search, filters.status, filters.sortBy, filters.sortOrder, pagination.page]);

  const loadOrganizerProfile = async () => {
    if (!user?.id) return;

    const { organizer, error } = await OrganizerService.getOrganizerByUserId(user.id);

    if (error || !organizer) {
      router.push('/organizer/create');
      return;
    }

    setOrganizerId(organizer.id);
  };

  const loadEvents = async () => {
    if (!organizerId) return;

    try {
      setLoading(true);
      setError(null);

      const filterParams: OrganizerEventFilters = {
        search: filters.search || undefined,
        status: filters.status.length > 0 ? filters.status : undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      const { events: eventsData, total, hasMore, error: eventsError } =
        await OrganizerService.getOrganizerEvents(
          organizerId,
          filterParams,
          pagination.page,
          pagination.limit
        );

      if (eventsError) {
        throw new Error(eventsError);
      }

      setEvents(eventsData);
      setPagination(prev => ({ ...prev, total, hasMore }));
    } catch (err) {
      console.error('Error loading events:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleStatusFilter = (status: EventStatus) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status?.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...(prev.status || []), status],
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSortChange = (sortBy: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: sortBy as any,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc',
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSelectEvent = (eventId: string) => {
    setSelectedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      setShowBulkActions(newSet.size > 0);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedEvents.size === events.length) {
      setSelectedEvents(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedEvents(new Set(events.map(e => e.id)));
      setShowBulkActions(true);
    }
  };

  const handleBulkAction = async (action: BulkOperation['action']) => {
    if (!organizerId || selectedEvents.size === 0) return;

    setBulkLoading(true);
    try {
      const operation: BulkOperation = {
        eventIds: Array.from(selectedEvents),
        action,
      };

      const result = await OrganizerService.performBulkOperation(organizerId, operation);

      if (result.failed.length > 0) {
        console.error('Some operations failed:', result.failed);
        setError(`${result.successful.length} events updated successfully. ${result.failed.length} failed.`);
      } else {
        setSuccessMessage(`${result.successful.length} events ${action}ed successfully!`);
        setShowSuccessMessage(true);
      }

      setSelectedEvents(new Set());
      setShowBulkActions(false);
      await loadEvents(); // Reload to show updated statuses
    } catch (err) {
      console.error('Bulk operation error:', err);
      setError(err instanceof Error ? err.message : 'Bulk operation failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!organizerId || !confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      const { success, error } = await OrganizerService.deleteEvent(eventId, organizerId);
      if (error) {
        setError(error);
      } else if (success) {
        setSuccessMessage('Event deleted successfully!');
        setShowSuccessMessage(true);
        await loadEvents();
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case 'published':
        return 'text-green-700 bg-green-100';
      case 'approved':
        return 'text-blue-700 bg-blue-100';
      case 'pending':
        return 'text-yellow-700 bg-yellow-100';
      case 'draft':
        return 'text-gray-700 bg-gray-100';
      case 'rejected':
        return 'text-red-700 bg-red-100';
      case 'archived':
        return 'text-purple-700 bg-purple-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusIcon = (status: EventStatus) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'draft':
        return <FileText className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'archived':
        return <Archive className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !organizerId) {
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
              <h1 className="text-2xl font-bold text-gray-900">My Events</h1>
              <p className="text-gray-600 mt-1">
                Manage all your events in one place
              </p>
            </div>
            <Link
              href="/organizer/events/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Create Event
            </Link>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-green-800">{successMessage}</p>
                <button
                  onClick={() => setShowSuccessMessage(false)}
                  className="mt-2 text-sm text-green-700 hover:text-green-800 font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-sm text-red-700 hover:text-red-800 font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={filters.search}
                  onChange={handleSearch}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setFilters(prev => ({ ...prev, showFilters: !prev.showFilters }))}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                <ChevronDown className={`w-4 h-4 ml-2 transform transition-transform ${
                  filters.showFilters ? 'rotate-180' : ''
                }`} />
              </button>
            </div>

            {/* Expanded Filters */}
            {filters.showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <div className="space-y-2">
                      {(['draft', 'pending', 'approved', 'published', 'rejected', 'archived'] as EventStatus[]).map((status) => (
                        <label key={status} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.status?.includes(status) || false}
                            onChange={() => handleStatusFilter(status)}
                            className="rounded border-gray-300 mr-2"
                          />
                          <span className="text-sm text-gray-700 capitalize">{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Sort Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sort By
                    </label>
                    <select
                      value={`${filters.sortBy}-${filters.sortOrder}`}
                      onChange={(e) => {
                        const [sortBy, sortOrder] = e.target.value.split('-');
                        setFilters(prev => ({
                          ...prev,
                          sortBy: sortBy as any,
                          sortOrder: sortOrder as 'asc' | 'desc',
                        }));
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="updated-desc">Recently Updated</option>
                      <option value="created-desc">Recently Created</option>
                      <option value="startTime-asc">Event Date (Earliest)</option>
                      <option value="startTime-desc">Event Date (Latest)</option>
                      <option value="title-asc">Title (A-Z)</option>
                      <option value="title-desc">Title (Z-A)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {showBulkActions && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckSquare className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-blue-800 font-medium">
                  {selectedEvents.size} event{selectedEvents.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkAction('submit')}
                  disabled={bulkLoading}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  Submit for Approval
                </button>
                <button
                  onClick={() => handleBulkAction('archive')}
                  disabled={bulkLoading}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-50"
                >
                  Archive
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  disabled={bulkLoading}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Events List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-600 mb-4">
                {filters.search || filters.status?.length
                  ? 'Try adjusting your filters or search terms.'
                  : 'Create your first event to get started.'}
              </p>
              <Link
                href="/organizer/events/new"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Create Event
              </Link>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <div className="flex items-center">
                  <button
                    onClick={handleSelectAll}
                    className="mr-4"
                  >
                    {selectedEvents.size === events.length ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  <div className="grid grid-cols-12 gap-4 flex-1 text-sm font-medium text-gray-700">
                    <div className="col-span-4">Event</div>
                    <div className="col-span-2">Date</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Analytics</div>
                    <div className="col-span-2">Actions</div>
                  </div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200">
                {events.map((event) => (
                  <div key={event.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center">
                      <button
                        onClick={() => handleSelectEvent(event.id)}
                        className="mr-4"
                      >
                        {selectedEvents.has(event.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <div className="grid grid-cols-12 gap-4 flex-1">
                        {/* Event Info */}
                        <div className="col-span-4">
                          <h3 className="text-sm font-medium text-gray-900 mb-1">
                            {event.title}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {event.customLocation}
                          </p>
                          {event.isFree ? (
                            <span className="inline-block mt-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Free
                            </span>
                          ) : (
                            <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              HKD {event.priceRange[0]} - {event.priceRange[1]}
                            </span>
                          )}
                        </div>

                        {/* Date */}
                        <div className="col-span-2">
                          <p className="text-sm text-gray-900">
                            {event.startTime.toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            {event.allDay ? 'All day' : event.startTime.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>

                        {/* Status */}
                        <div className="col-span-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                            {getStatusIcon(event.status)}
                            <span className="ml-1 capitalize">{event.status}</span>
                          </span>
                        </div>

                        {/* Analytics */}
                        <div className="col-span-2">
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Eye className="w-4 h-4 mr-1" />
                              {event.views || 0}
                            </div>
                            <div className="flex items-center">
                              <BarChart3 className="w-4 h-4 mr-1" />
                              {event.rsvps || 0}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="col-span-2">
                          <div className="flex items-center space-x-2">
                            <Link
                              href={`/organizer/events/${event.id}/edit`}
                              className="p-1 text-gray-400 hover:text-blue-600"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/organizer/events/${event.id}/analytics`}
                              className="p-1 text-gray-400 hover:text-green-600"
                            >
                              <BarChart3 className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.hasMore && (
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={loading}
                    className="w-full py-2 text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    Load More Events
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrganizerEvents() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    }>
      <OrganizerEventsContent />
    </Suspense>
  );
}