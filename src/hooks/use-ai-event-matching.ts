'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location: string;
  venue?: string;
  price: number;
  category: string;
  tags: string[];
  imageUrl?: string;
  organizer: string;
  attendeesCount?: number;
  maxAttendees?: number;
}

interface EventAnalytics {
  totalSwipes: number;
  interestedCount: number;
  passedCount: number;
  savedEvents: number;
  topCategories: Array<{ name: string; count: number; percentage: number }>;
  avgEventScore: number;
  priceRangePreference: { min: number; max: number };
  timePreferences: Array<{ time: string; count: number }>;
  locationPreferences: Array<{ location: string; count: number }>;
}

interface EventPreferences {
  location: string;
  maxDistance: number;
  interests: string[];
  eventTypes: string[];
  priceRange: [number, number];
  timeOfDay: string[];
}

interface UseAIEventMatchingProps {
  userId?: string;
  enabled?: boolean;
  preferences?: EventPreferences;
}

type SwipeAction = 'interested' | 'not_interested';

export function useAIEventMatching({
  userId,
  enabled = true,
  preferences
}: UseAIEventMatchingProps = {}) {
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
  const [savedEvents, setSavedEvents] = useState<Event[]>([]);
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data for demonstration - in real implementation, this would come from your events database
  const mockEvents: Event[] = [
    {
      id: '1',
      title: 'Hong Kong Art Fair 2024',
      description: 'Contemporary art exhibition featuring local and international artists',
      date: '2024-10-15',
      time: '10:00 AM',
      location: 'Central, Hong Kong',
      venue: 'Hong Kong Convention and Exhibition Centre',
      price: 150,
      category: 'Art & Culture',
      tags: ['art', 'exhibition', 'contemporary', 'culture'],
      organizer: 'Hong Kong Art Foundation',
      attendeesCount: 250,
      maxAttendees: 500,
      imageUrl: '/api/placeholder/400/300'
    },
    {
      id: '2',
      title: 'Tech Startup Networking Night',
      description: 'Connect with fellow entrepreneurs and tech enthusiasts',
      date: '2024-10-18',
      time: '7:00 PM',
      location: 'Wan Chai, Hong Kong',
      venue: 'WeWork Tower 535',
      price: 0,
      category: 'Technology',
      tags: ['networking', 'startup', 'tech', 'business'],
      organizer: 'Hong Kong Tech Community',
      attendeesCount: 85,
      maxAttendees: 100
    },
    {
      id: '3',
      title: 'Dim Sum Workshop',
      description: 'Learn to make traditional dim sum from master chefs',
      date: '2024-10-20',
      time: '2:00 PM',
      location: 'Tsim Sha Tsui, Hong Kong',
      venue: 'Cooking Academy HK',
      price: 280,
      category: 'Food & Drink',
      tags: ['cooking', 'dim sum', 'workshop', 'traditional'],
      organizer: 'Culinary Arts HK',
      attendeesCount: 12,
      maxAttendees: 20
    },
    {
      id: '4',
      title: 'Victoria Peak Night Hike',
      description: 'Guided night hike to see Hong Kong\'s stunning skyline',
      date: '2024-10-22',
      time: '6:30 PM',
      location: 'Victoria Peak, Hong Kong',
      venue: 'Peak Tram Station',
      price: 120,
      category: 'Outdoor & Sports',
      tags: ['hiking', 'night', 'skyline', 'outdoor'],
      organizer: 'HK Adventure Club',
      attendeesCount: 35,
      maxAttendees: 50
    },
    {
      id: '5',
      title: 'Jazz Night at Fringe Club',
      description: 'Intimate jazz performance featuring local musicians',
      date: '2024-10-25',
      time: '8:00 PM',
      location: 'Central, Hong Kong',
      venue: 'Hong Kong Fringe Club',
      price: 200,
      category: 'Music',
      tags: ['jazz', 'music', 'live', 'intimate'],
      organizer: 'Fringe Club',
      attendeesCount: 45,
      maxAttendees: 80
    }
  ];

  // Calculate event score based on user preferences
  const calculateEventScore = useCallback((event: Event): number => {
    if (!preferences) return Math.floor(Math.random() * 30) + 70; // Random score between 70-100

    let score = 50; // Base score

    // Price preference matching
    const [minPrice, maxPrice] = preferences.priceRange;
    if (event.price >= minPrice && event.price <= maxPrice) {
      score += 20;
    } else if (Math.abs(event.price - minPrice) <= 50 || Math.abs(event.price - maxPrice) <= 50) {
      score += 10; // Close to preferred range
    }

    // Category/interest matching
    const eventCategories = [event.category, ...event.tags].map(c => c.toLowerCase());
    const userInterests = [...preferences.interests, ...preferences.eventTypes].map(i => i.toLowerCase());
    const matchingInterests = eventCategories.filter(cat =>
      userInterests.some(interest => cat.includes(interest) || interest.includes(cat))
    );
    score += Math.min(matchingInterests.length * 10, 30);

    // Location preference (simplified - would need geolocation in real app)
    if (preferences.location && event.location.toLowerCase().includes(preferences.location.toLowerCase())) {
      score += 15;
    }

    return Math.min(Math.max(score, 0), 100);
  }, [preferences]);

  // Get event score for a specific event
  const getEventScore = useCallback((eventId: string): number => {
    const event = [...recommendedEvents, ...savedEvents].find(e => e.id === eventId);
    return event ? calculateEventScore(event) : 75;
  }, [recommendedEvents, savedEvents, calculateEventScore]);

  // Load recommended events
  const loadRecommendedEvents = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      // In a real implementation, this would be an API call to your backend
      // that uses AI/ML to recommend events based on user preferences and behavior

      // For now, we'll filter and sort mock events based on preferences
      let events = [...mockEvents];

      if (preferences) {
        // Filter by price range
        events = events.filter(event =>
          event.price >= preferences.priceRange[0] &&
          event.price <= preferences.priceRange[1]
        );

        // Filter by interests/categories
        if (preferences.interests.length > 0 || preferences.eventTypes.length > 0) {
          const userInterests = [...preferences.interests, ...preferences.eventTypes].map(i => i.toLowerCase());
          events = events.filter(event => {
            const eventCategories = [event.category, ...event.tags].map(c => c.toLowerCase());
            return eventCategories.some(cat =>
              userInterests.some(interest => cat.includes(interest) || interest.includes(cat))
            );
          });
        }

        // Sort by calculated score
        events.sort((a, b) => calculateEventScore(b) - calculateEventScore(a));
      }

      setRecommendedEvents(events);
    } catch (err) {
      setError('Failed to load recommended events');
      console.error('Error loading recommended events:', err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, preferences, calculateEventScore]);

  // Load saved events
  const loadSavedEvents = useCallback(async () => {
    if (!enabled || !userId) return;

    try {
      // In a real implementation, this would fetch from your database
      // For now, we'll use localStorage to persist saved events
      const saved = localStorage.getItem(`savedEvents_${userId}`);
      if (saved) {
        const savedEventIds = JSON.parse(saved);
        const savedEventsList = mockEvents.filter(event => savedEventIds.includes(event.id));
        setSavedEvents(savedEventsList);
      }
    } catch (err) {
      console.error('Error loading saved events:', err);
    }
  }, [enabled, userId]);

  // Load analytics
  const loadAnalytics = useCallback(async () => {
    if (!enabled || !userId) return;

    try {
      // In a real implementation, this would calculate analytics from your database
      // For now, we'll simulate analytics based on saved events and mock data
      const saved = localStorage.getItem(`savedEvents_${userId}`);
      const swipeHistory = localStorage.getItem(`swipeHistory_${userId}`);

      const savedEventIds = saved ? JSON.parse(saved) : [];
      const swipes = swipeHistory ? JSON.parse(swipeHistory) : [];

      const interestedCount = swipes.filter((s: any) => s.action === 'interested').length;
      const passedCount = swipes.filter((s: any) => s.action === 'not_interested').length;
      const totalSwipes = swipes.length;

      // Calculate category preferences
      const categoryCount: Record<string, number> = {};
      savedEventIds.forEach((id: string) => {
        const event = mockEvents.find(e => e.id === id);
        if (event) {
          categoryCount[event.category] = (categoryCount[event.category] || 0) + 1;
        }
      });

      const topCategories = Object.entries(categoryCount)
        .map(([name, count]) => ({
          name,
          count,
          percentage: totalSwipes > 0 ? (count / totalSwipes) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count);

      // Calculate average event score
      const avgEventScore = savedEventIds.length > 0
        ? savedEventIds.reduce((sum: number, id: string) => {
            const event = mockEvents.find(e => e.id === id);
            return sum + (event ? calculateEventScore(event) : 75);
          }, 0) / savedEventIds.length
        : 75;

      // Mock time and location preferences
      const timePreferences = [
        { time: 'morning', count: Math.floor(Math.random() * 10) + 1 },
        { time: 'afternoon', count: Math.floor(Math.random() * 15) + 1 },
        { time: 'evening', count: Math.floor(Math.random() * 20) + 1 }
      ];

      const locationPreferences = [
        { location: 'Central', count: Math.floor(Math.random() * 10) + 1 },
        { location: 'Wan Chai', count: Math.floor(Math.random() * 8) + 1 },
        { location: 'Tsim Sha Tsui', count: Math.floor(Math.random() * 12) + 1 },
        { location: 'Causeway Bay', count: Math.floor(Math.random() * 6) + 1 }
      ];

      const analyticsData: EventAnalytics = {
        totalSwipes,
        interestedCount,
        passedCount,
        savedEvents: savedEventIds.length,
        topCategories,
        avgEventScore,
        priceRangePreference: { min: 0, max: 300 },
        timePreferences,
        locationPreferences
      };

      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error loading analytics:', err);
    }
  }, [enabled, userId, calculateEventScore]);

  // Handle swipe action
  const swipeOnEvent = useCallback(async (eventId: string, action: SwipeAction) => {
    if (!userId) return;

    try {
      // Save swipe history
      const swipeHistory = localStorage.getItem(`swipeHistory_${userId}`);
      const swipes = swipeHistory ? JSON.parse(swipeHistory) : [];
      swipes.push({ eventId, action, timestamp: new Date().toISOString() });
      localStorage.setItem(`swipeHistory_${userId}`, JSON.stringify(swipes));

      // If interested, add to saved events
      if (action === 'interested') {
        const saved = localStorage.getItem(`savedEvents_${userId}`);
        const savedEventIds = saved ? JSON.parse(saved) : [];
        if (!savedEventIds.includes(eventId)) {
          savedEventIds.push(eventId);
          localStorage.setItem(`savedEvents_${userId}`, JSON.stringify(savedEventIds));

          // Update saved events state
          const event = mockEvents.find(e => e.id === eventId);
          if (event) {
            setSavedEvents(prev => [...prev, event]);
          }
        }
      }

      // Reload analytics to reflect new data
      loadAnalytics();
    } catch (err) {
      console.error('Error recording swipe:', err);
    }
  }, [userId, loadAnalytics]);

  // Update preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<EventPreferences>) => {
    // In a real implementation, this would save to your database
    // For now, we'll just trigger a reload of recommended events
    if (preferences) {
      Object.assign(preferences, newPreferences);
      loadRecommendedEvents();
    }
  }, [preferences, loadRecommendedEvents]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    if (enabled) {
      loadRecommendedEvents();
      loadSavedEvents();
      loadAnalytics();
    }
  }, [enabled, userId, loadRecommendedEvents, loadSavedEvents, loadAnalytics]);

  return {
    recommendedEvents,
    savedEvents,
    analytics,
    isLoading,
    error,
    swipeOnEvent,
    getEventScore,
    updatePreferences,
    refresh: () => {
      loadRecommendedEvents();
      loadSavedEvents();
      loadAnalytics();
    }
  };
}