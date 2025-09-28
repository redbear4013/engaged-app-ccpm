'use client';

import React, { useState } from 'react';
import { CalendarEventsView } from '@/components/calendar';
import { useAuth } from '@/hooks/use-auth';
import { useCalendarEvents } from '@/hooks/use-calendar-events';
import { EnhancedEventModal } from '@/components/calendar/enhanced-event-modal';
import { ExternalCalendarSync } from '@/components/calendar/external-calendar-sync';
import { InteractiveWeekView } from '@/components/calendar/interactive-week-view';
import { CalendarEvent } from '@/types/calendar';
import { CalendarView } from '@/components/calendar/calendar-navigation';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Download, Upload, Cloud, Calendar as CalendarIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState as useReactState } from 'react';

export default function CalendarPage() {
  const { user, isAuthenticated } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<CalendarView>('month');
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'sync'>('calendar');
  const [draggedEventData, setDraggedEventData] = useState<{ eventId: string; newStartTime: Date; newEndTime: Date } | null>(null);
  const [showDragAndDrop, setShowDragAndDrop] = useState(false);

  // Get calendar events for the authenticated user
  const {
    events,
    isLoading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    refetch
  } = useCalendarEvents({
    userId: user?.id,
    enabled: isAuthenticated
  });

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
    setIsCreatingEvent(false);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleTimeSlotClick = (date: Date, hour: number) => {
    // Create new event at the selected time
    const newEventDate = new Date(date);
    newEventDate.setHours(hour, 0, 0, 0);
    setSelectedDate(newEventDate);
    setSelectedEvent(null);
    setIsCreatingEvent(true);
    setShowEventModal(true);
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setIsCreatingEvent(true);
    setShowEventModal(true);
  };

  const handleEventSave = async (eventData: Partial<CalendarEvent>) => {
    try {
      if (isCreatingEvent) {
        await createEvent({
          ...eventData,
          start_time: eventData.start_time || selectedDate.toISOString(),
          end_time: eventData.end_time || new Date(selectedDate.getTime() + 60 * 60 * 1000).toISOString(),
        });
      } else if (selectedEvent) {
        await updateEvent(selectedEvent.id, eventData);
      }
      setShowEventModal(false);
      setSelectedEvent(null);
      setIsCreatingEvent(false);
      refetch();
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleEventDelete = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
      setShowEventModal(false);
      setSelectedEvent(null);
      refetch();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleViewChange = (view: CalendarView) => {
    setCurrentView(view);
  };

  const handleEventDrop = async (eventId: string, newStartTime: Date, newEndTime: Date) => {
    try {
      await updateEvent(eventId, {
        start_time: newStartTime.toISOString(),
        end_time: newEndTime.toISOString(),
      });
      refetch();
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleEventResize = async (eventId: string, newStartTime: Date, newEndTime: Date) => {
    try {
      await updateEvent(eventId, {
        start_time: newStartTime.toISOString(),
        end_time: newEndTime.toISOString(),
      });
      refetch();
    } catch (error) {
      console.error('Error resizing event:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md mx-4"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <Plus className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Calendar</h1>
          <p className="text-gray-600 mb-6">
            Sign in to manage your personal calendar, create events, and sync with external calendars.
          </p>
          <Button
            onClick={() => window.location.href = '/auth/signin'}
            className="w-full"
          >
            Sign In to Continue
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-2xl font-bold text-gray-900"
              >
                My Calendar
              </motion.h1>
              <div className="hidden sm:block text-sm text-gray-500">
                {user?.fullName || user?.email}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDragAndDrop(!showDragAndDrop)}
                className={`flex items-center space-x-2 ${
                  showDragAndDrop ? 'bg-blue-50 text-blue-600 border-blue-300' : ''
                }`}
              >
                <CalendarIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Interactive</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Import</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('sync')}
                className={`flex items-center space-x-2 ${
                  activeTab === 'sync' ? 'bg-blue-50 text-blue-600 border-blue-300' : ''
                }`}
              >
                <Cloud className="w-4 h-4" />
                <span className="hidden sm:inline">Sync</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </Button>

              <Button
                onClick={handleCreateEvent}
                size="sm"
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Event</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex items-center space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'calendar'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'sync'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            External Sync
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">
                  Error loading calendar events. Please try refreshing the page.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'calendar' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            {showDragAndDrop && currentView === 'week' ? (
              <InteractiveWeekView
                currentDate={selectedDate}
                events={events || []}
                onEventClick={handleEventClick}
                onEventDrop={handleEventDrop}
                onEventResize={handleEventResize}
                onTimeSlotClick={handleTimeSlotClick}
                showConflicts={true}
                className="h-[calc(100vh-16rem)]"
              />
            ) : (
              <CalendarEventsView
                initialDate={selectedDate}
                initialView={currentView}
                events={events || []}
                onEventClick={handleEventClick}
                onDateSelect={handleDateSelect}
                onTimeSlotClick={handleTimeSlotClick}
                onViewChange={handleViewChange}
                isLoading={isLoading}
                className="h-[calc(100vh-16rem)]"
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <ExternalCalendarSync />
          </motion.div>
        )}

        {/* Calendar Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Total Events</p>
                <p className="text-2xl font-semibold text-gray-900">{events?.length || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">This Week</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {events?.filter(event => {
                    const eventDate = new Date(event.start_time);
                    const now = new Date();
                    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
                    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
                    return eventDate >= startOfWeek && eventDate <= endOfWeek;
                  }).length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Upcoming</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {events?.filter(event => new Date(event.start_time) > new Date()).length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">This Month</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {events?.filter(event => {
                    const eventDate = new Date(event.start_time);
                    const now = new Date();
                    return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
                  }).length || 0}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Enhanced Event Modal */}
      {showEventModal && (
        <EnhancedEventModal
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
            setIsCreatingEvent(false);
          }}
          event={selectedEvent}
          isCreating={isCreatingEvent}
          onSave={handleEventSave}
          onDelete={selectedEvent ? () => handleEventDelete(selectedEvent.id) : undefined}
          defaultDate={selectedDate}
          allEvents={events || []}
          invitations={[]} // TODO: Load invitations for the event
          onSendInvitation={async (invitations) => {
            // TODO: Implement invitation sending
            console.log('Send invitations:', invitations);
          }}
          onResendInvitation={async (invitationId) => {
            // TODO: Implement invitation resending
            console.log('Resend invitation:', invitationId);
          }}
          onCancelInvitation={async (invitationId) => {
            // TODO: Implement invitation cancellation
            console.log('Cancel invitation:', invitationId);
          }}
          onUpdateRSVP={async (invitationId, rsvpStatus, note) => {
            // TODO: Implement RSVP update
            console.log('Update RSVP:', invitationId, rsvpStatus, note);
          }}
          isOrganizer={true}
        />
      )}
    </div>
  );
}