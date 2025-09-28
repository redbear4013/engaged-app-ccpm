'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MessageCircle,
  Calendar,
  MapPin,
  User,
  DollarSign,
  Tag,
  ExternalLink,
  Filter,
  Search,
  ChevronDown,
  ArrowLeft,
  AlertTriangle,
  Users,
  Star,
} from 'lucide-react';
import { OrganizerEvent, EventStatus } from '@/types/organizer';
import Link from 'next/link';

interface AdminEventFilters {
  status: EventStatus[];
  search: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  organizerFilter?: string;
  showFilters: boolean;
}

interface ApprovalAction {
  eventId: string;
  action: 'approve' | 'reject';
  reason?: string;
  adminNotes?: string;
}

export default function AdminEventsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<OrganizerEvent | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<ApprovalAction | null>(null);
  const [processingApproval, setProcessingApproval] = useState(false);
  const [filters, setFilters] = useState<AdminEventFilters>({
    status: ['pending'],
    search: '',
    showFilters: false,
  });

  // Check if user is admin (simplified - in real app, check role/permissions)
  const isAdmin = user?.isPro; // Temporary check using isPro as admin flag

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth?redirect=/admin/events');
      return;
    }

    if (isAuthenticated && !isAdmin) {
      router.push('/dashboard');
      return;
    }

    if (isAuthenticated && isAdmin) {
      loadPendingEvents();
    }
  }, [isAuthenticated, isLoading, isAdmin, router, filters]);

  const loadPendingEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data for admin events review
      // In a real implementation, you'd call an admin API endpoint
      const mockEvents: OrganizerEvent[] = [
        {
          id: '1',
          title: 'Summer Music Festival 2024',
          description: 'A spectacular outdoor music festival featuring local and international artists...',
          shortDescription: 'Outdoor music festival with amazing lineup',
          startTime: new Date('2024-07-15T18:00:00'),
          endTime: new Date('2024-07-15T23:00:00'),
          timezone: 'Asia/Hong_Kong',
          allDay: false,
          venueId: null,
          customLocation: 'Central Park, Hong Kong',
          organizerId: 'org1',
          categoryId: '1',
          posterUrl: null,
          galleryUrls: [],
          tags: ['music', 'festival', 'outdoor', 'summer'],
          isFree: false,
          priceRange: [200, 500],
          ticketUrl: 'https://tickets.example.com/summer-festival',
          registrationRequired: true,
          capacity: 5000,
          status: 'pending' as EventStatus,
          createdAt: new Date('2024-06-01T10:00:00'),
          updatedAt: new Date('2024-06-01T10:00:00'),
          publishedAt: null,
          views: 0,
          saves: 0,
          rsvps: 0,
          clicks: 0,
        },
        {
          id: '2',
          title: 'Tech Innovation Conference',
          description: 'Join industry leaders for a day of insights into the latest technology trends...',
          shortDescription: 'Conference on latest tech trends',
          startTime: new Date('2024-08-20T09:00:00'),
          endTime: new Date('2024-08-20T17:00:00'),
          timezone: 'Asia/Hong_Kong',
          allDay: false,
          venueId: null,
          customLocation: 'Hong Kong Convention Centre',
          organizerId: 'org2',
          categoryId: '6',
          posterUrl: null,
          galleryUrls: [],
          tags: ['technology', 'conference', 'innovation', 'networking'],
          isFree: false,
          priceRange: [300, 800],
          ticketUrl: 'https://tickets.example.com/tech-conf',
          registrationRequired: true,
          capacity: 1000,
          status: 'pending' as EventStatus,
          createdAt: new Date('2024-06-02T14:30:00'),
          updatedAt: new Date('2024-06-02T14:30:00'),
          publishedAt: null,
          views: 0,
          saves: 0,
          rsvps: 0,
          clicks: 0,
        },
        {
          id: '3',
          title: 'Community Art Workshop',
          description: 'Free art workshop for all ages, learn painting and sculpture techniques...',
          shortDescription: 'Free community art workshop',
          startTime: new Date('2024-07-10T14:00:00'),
          endTime: new Date('2024-07-10T16:00:00'),
          timezone: 'Asia/Hong_Kong',
          allDay: false,
          venueId: null,
          customLocation: 'Community Center, Wan Chai',
          organizerId: 'org3',
          categoryId: '2',
          posterUrl: null,
          galleryUrls: [],
          tags: ['art', 'workshop', 'community', 'free', 'family-friendly'],
          isFree: true,
          priceRange: [0, 0],
          ticketUrl: null,
          registrationRequired: false,
          capacity: 50,
          status: 'pending' as EventStatus,
          createdAt: new Date('2024-06-03T09:15:00'),
          updatedAt: new Date('2024-06-03T09:15:00'),
          publishedAt: null,
          views: 0,
          saves: 0,
          rsvps: 0,
          clicks: 0,
        },
      ];

      // Filter events based on current filters
      let filteredEvents = mockEvents;

      if (filters.search) {
        filteredEvents = filteredEvents.filter(event =>
          event.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          event.description.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      if (filters.status.length > 0) {
        filteredEvents = filteredEvents.filter(event =>
          filters.status.includes(event.status)
        );
      }

      setEvents(filteredEvents);
    } catch (err) {
      console.error('Error loading events:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveEvent = (event: OrganizerEvent) => {
    setSelectedEvent(event);
    setApprovalAction({
      eventId: event.id,
      action: 'approve',
    });
    setShowApprovalModal(true);
  };

  const handleRejectEvent = (event: OrganizerEvent) => {
    setSelectedEvent(event);
    setApprovalAction({
      eventId: event.id,
      action: 'reject',
    });
    setShowApprovalModal(true);
  };

  const handleSubmitApproval = async () => {
    if (!approvalAction) return;

    setProcessingApproval(true);
    try {
      // In a real implementation, you'd call an admin API endpoint
      console.log('Processing approval:', approvalAction);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update the event status locally
      setEvents(prev => prev.map(event =>
        event.id === approvalAction.eventId
          ? {
              ...event,
              status: approvalAction.action === 'approve' ? 'approved' : 'rejected',
              rejectionReason: approvalAction.reason,
              adminNotes: approvalAction.adminNotes,
            }
          : event
      ));

      setShowApprovalModal(false);
      setSelectedEvent(null);
      setApprovalAction(null);
    } catch (err) {
      console.error('Error processing approval:', err);
      setError(err instanceof Error ? err.message : 'Failed to process approval');
    } finally {
      setProcessingApproval(false);
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
      case 'rejected':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getPriorityScore = (event: OrganizerEvent) => {
    // Simple priority scoring based on various factors
    let score = 0;

    // Time urgency (events happening soon get higher priority)
    const daysUntilEvent = Math.ceil((event.startTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilEvent <= 7) score += 3;
    else if (daysUntilEvent <= 14) score += 2;
    else if (daysUntilEvent <= 30) score += 1;

    // Large capacity events
    if (event.capacity && event.capacity > 1000) score += 2;
    else if (event.capacity && event.capacity > 500) score += 1;

    // Paid events (might need more verification)
    if (!event.isFree) score += 1;

    return score;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
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
                  href="/dashboard"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 mr-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Event Review & Approval</h1>
              <p className="text-gray-600 mt-1">
                Review and manage event submissions from organizers
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{events.filter(e => e.status === 'pending').length}</span> pending review
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
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
        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

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

            {filters.showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <div className="space-y-2">
                      {(['pending', 'approved', 'rejected', 'published'] as EventStatus[]).map((status) => (
                        <label key={status} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.status.includes(status)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilters(prev => ({
                                  ...prev,
                                  status: [...prev.status, status]
                                }));
                              } else {
                                setFilters(prev => ({
                                  ...prev,
                                  status: prev.status.filter(s => s !== status)
                                }));
                              }
                            }}
                            className="rounded border-gray-300 mr-2"
                          />
                          <span className="text-sm text-gray-700 capitalize">{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Events List */}
        <div className="space-y-6">
          {loading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events to review</h3>
              <p className="text-gray-600">
                All events have been reviewed or no new submissions match your filters.
              </p>
            </div>
          ) : (
            events
              .sort((a, b) => getPriorityScore(b) - getPriorityScore(a))
              .map((event) => (
                <div key={event.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-xl font-semibold text-gray-900 mr-3">
                            {event.title}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                            {event.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                            <span className="capitalize">{event.status}</span>
                          </span>
                          {getPriorityScore(event) > 3 && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              High Priority
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-3">{event.shortDescription}</p>

                        {/* Event Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="w-4 h-4 mr-2" />
                            <div>
                              <div>{event.startTime.toLocaleDateString()}</div>
                              <div>{event.allDay ? 'All day' : event.startTime.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}</div>
                            </div>
                          </div>

                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mr-2" />
                            <span className="truncate">{event.customLocation}</span>
                          </div>

                          <div className="flex items-center text-sm text-gray-600">
                            <DollarSign className="w-4 h-4 mr-2" />
                            <span>
                              {event.isFree ? 'Free' : `HKD ${event.priceRange[0]} - ${event.priceRange[1]}`}
                            </span>
                          </div>

                          <div className="flex items-center text-sm text-gray-600">
                            <Users className="w-4 h-4 mr-2" />
                            <span>{event.capacity ? `Up to ${event.capacity}` : 'No limit'}</span>
                          </div>
                        </div>

                        {/* Tags */}
                        {event.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {event.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600"
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Description */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Event Description</h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {event.description.length > 300
                              ? `${event.description.substring(0, 300)}...`
                              : event.description
                            }
                          </p>
                        </div>

                        {/* Additional Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Registration:</span>
                            <span className="ml-2 text-gray-600">
                              {event.registrationRequired ? 'Required' : 'Not required'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Submitted:</span>
                            <span className="ml-2 text-gray-600">
                              {event.createdAt.toLocaleDateString()}
                            </span>
                          </div>
                          {event.ticketUrl && (
                            <div>
                              <span className="font-medium text-gray-700">Tickets:</span>
                              <a
                                href={event.ticketUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 text-blue-600 hover:text-blue-700 inline-flex items-center"
                              >
                                View <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {event.status === 'pending' && (
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <button className="flex items-center hover:text-blue-600">
                            <Eye className="w-4 h-4 mr-1" />
                            Preview
                          </button>
                          <button className="flex items-center hover:text-blue-600">
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Contact Organizer
                          </button>
                        </div>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleRejectEvent(event)}
                            className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 flex items-center"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveEvent(event)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedEvent && approvalAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {approvalAction.action === 'approve' ? 'Approve Event' : 'Reject Event'}
              </h3>

              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">{selectedEvent.title}</h4>
                <p className="text-sm text-gray-600">
                  {selectedEvent.startTime.toLocaleDateString()} at {selectedEvent.customLocation}
                </p>
              </div>

              {approvalAction.action === 'reject' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason *
                  </label>
                  <select
                    value={approvalAction.reason || ''}
                    onChange={(e) => setApprovalAction(prev => prev ? { ...prev, reason: e.target.value } : null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select a reason</option>
                    <option value="inappropriate_content">Inappropriate content</option>
                    <option value="incomplete_information">Incomplete information</option>
                    <option value="duplicate_event">Duplicate event</option>
                    <option value="invalid_location">Invalid or unclear location</option>
                    <option value="pricing_issues">Pricing or ticketing issues</option>
                    <option value="policy_violation">Policy violation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes {approvalAction.action === 'reject' ? '(Required)' : '(Optional)'}
                </label>
                <textarea
                  value={approvalAction.adminNotes || ''}
                  onChange={(e) => setApprovalAction(prev => prev ? { ...prev, adminNotes: e.target.value } : null)}
                  placeholder={
                    approvalAction.action === 'approve'
                      ? 'Add any notes or suggestions for the organizer...'
                      : 'Explain why this event was rejected and what changes are needed...'
                  }
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required={approvalAction.action === 'reject'}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedEvent(null);
                    setApprovalAction(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={processingApproval}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitApproval}
                  disabled={
                    processingApproval ||
                    (approvalAction.action === 'reject' && (!approvalAction.reason || !approvalAction.adminNotes))
                  }
                  className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${
                    approvalAction.action === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {processingApproval ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      {approvalAction.action === 'approve' ? (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      {approvalAction.action === 'approve' ? 'Approve Event' : 'Reject Event'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}