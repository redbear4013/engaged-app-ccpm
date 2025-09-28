'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { EventSwipeDeck } from '@/components/ai-match/event-swipe-deck-simple';
import { EventAnalyticsDashboard } from '@/components/ai-match/event-analytics-dashboard';
import { EventRecommendations } from '@/components/ai-match/event-recommendations';
import { PreferencesModal } from '@/components/ai-match/preferences-modal';
import { EventDetailModal } from '@/components/ai-match/event-detail-modal';
import { useAIEventMatching } from '@/hooks/use-ai-event-matching';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Calendar, TrendingUp, Settings, Zap, BookmarkPlus } from 'lucide-react';

export default function AIEventMatchPage() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'discover' | 'saved' | 'analytics'>('discover');
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);
  const [preferences, setPreferences] = useState({
    location: '',
    maxDistance: 50,
    interests: [] as string[],
    eventTypes: [] as string[],
    priceRange: [0, 500],
    timeOfDay: ['morning', 'afternoon', 'evening'] as string[]
  });

  const {
    recommendedEvents,
    savedEvents,
    isLoading,
    error,
    swipeOnEvent,
    getEventScore,
    updatePreferences,
    analytics
  } = useAIEventMatching({
    userId: user?.id,
    enabled: isAuthenticated,
    preferences
  });

  const handleEventSwipe = async (eventId: string, direction: 'left' | 'right') => {
    const action = direction === 'right' ? 'interested' : 'not_interested';
    await swipeOnEvent(eventId, action);
  };

  const handlePreferencesUpdate = async (newPreferences: typeof preferences) => {
    setPreferences(newPreferences);
    await updatePreferences(newPreferences);
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setIsEventDetailOpen(true);
  };

  const handleEventSave = async (eventId: string) => {
    await swipeOnEvent(eventId, 'interested');
  };

  const handleEventShare = (event: any) => {
    const shareData = {
      title: event.title,
      text: `Check out this event: ${event.title} on ${event.date} at ${event.location}`,
      url: `${window.location.origin}/events/${event.id}`,
    };

    if (navigator.share) {
      navigator.share(shareData);
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
      // You could add a toast notification here
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
            <Zap className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Event Discovery</h1>
          <p className="text-gray-600 mb-6">
            Sign in to discover events tailored to your interests with AI-powered recommendations.
          </p>
          <Button
            onClick={() => window.location.href = '/auth/signin'}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Sign In to Discover Events
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
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center space-x-3"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">AI Event Discovery</h1>
              </motion.div>
              <div className="hidden sm:block text-sm text-gray-500">
                {user?.fullName || user?.email}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
                onClick={() => setIsPreferencesOpen(true)}
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Preferences</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="discover" className="flex items-center space-x-2">
              <Heart className="w-4 h-4" />
              <span>Discover</span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center space-x-2">
              <BookmarkPlus className="w-4 h-4" />
              <span>Saved ({savedEvents?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Insights</span>
            </TabsTrigger>
          </TabsList>

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
                    Error loading event recommendations. Please try refreshing the page.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <TabsContent value="discover" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <EventSwipeDeck
                events={recommendedEvents || []}
                onSwipe={handleEventSwipe}
                isLoading={isLoading}
                getEventScore={getEventScore}
                className="max-w-md mx-auto"
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="saved" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <EventRecommendations
                events={savedEvents || []}
                title="Your Saved Events"
                emptyMessage="No saved events yet. Start swiping to discover events you're interested in!"
                onEventClick={handleEventClick}
                onBookmark={handleEventSave}
                onShare={handleEventShare}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <EventAnalyticsDashboard
                analytics={analytics}
                isLoading={isLoading}
              />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
        <Button
          size="lg"
          className="rounded-full shadow-lg hover:shadow-xl transition-shadow"
          onClick={() => window.location.href = '/calendar'}
        >
          <Calendar className="w-5 h-5 mr-2" />
          View Calendar
        </Button>
      </div>

      {/* Preferences Modal */}
      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        preferences={preferences}
        onSave={handlePreferencesUpdate}
      />

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isEventDetailOpen}
        onClose={() => {
          setIsEventDetailOpen(false);
          setSelectedEvent(null);
        }}
        onSave={handleEventSave}
        onShare={handleEventShare}
        getEventScore={getEventScore}
      />
    </div>
  );
}