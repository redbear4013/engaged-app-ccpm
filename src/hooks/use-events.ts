import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Event, EventFilters, PaginatedResponse } from '@/types';

const EVENTS_QUERY_KEY = 'events';

interface FetchEventsParams {
  page?: number;
  limit?: number;
  filters?: EventFilters;
}

export function useEvents(params: FetchEventsParams = {}) {
  const { page = 1, limit = 20, filters = {} } = params;

  return useQuery({
    queryKey: [EVENTS_QUERY_KEY, page, limit, filters],
    queryFn: async (): Promise<PaginatedResponse<Event>> => {
      let query = supabase
        .from('events')
        .select('*', { count: 'exact' })
        .range((page - 1) * limit, page * limit - 1)
        .order('start_date', { ascending: true });

      // Apply filters
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }

      if (filters.dateRange) {
        query = query
          .gte('start_date', filters.dateRange.start.toISOString())
          .lte('start_date', filters.dateRange.end.toISOString());
      }

      const { data, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      const events: Event[] =
        data?.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description || undefined,
          startDate: new Date(event.start_date),
          endDate: event.end_date ? new Date(event.end_date) : undefined,
          location: event.location || undefined,
          imageUrl: event.image_url || undefined,
          sourceUrl: event.source_url || undefined,
          createdAt: new Date(event.created_at),
          updatedAt: new Date(event.updated_at),
        })) || [];

      return {
        data: events,
        pagination: {
          page,
          limit,
          total: count || 0,
          hasMore: (count || 0) > page * limit,
        },
      };
    },
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: [EVENTS_QUERY_KEY, id],
    queryFn: async (): Promise<Event> => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        id: data.id,
        title: data.title,
        description: data.description || undefined,
        startDate: new Date(data.start_date),
        endDate: data.end_date ? new Date(data.end_date) : undefined,
        location: data.location || undefined,
        imageUrl: data.image_url || undefined,
        sourceUrl: data.source_url || undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    },
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>
    ) => {
      const { data, error } = await supabase
        .from('events')
        .insert({
          title: event.title,
          description: event.description,
          start_date: event.startDate.toISOString(),
          end_date: event.endDate?.toISOString(),
          location: event.location,
          image_url: event.imageUrl,
          source_url: event.sourceUrl,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY] });
    },
  });
}
