import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logApiRequest, logDatabaseError, logApiError, logSuccess } from '@/lib/api-logger'

export async function GET(request: NextRequest) {
  try {
    logApiRequest(request, { endpoint: '/api/admin/events/stats' });

    // Get total events count
    const supabase = await createServerSupabaseClient();
    const { count: totalEvents, error: eventsError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .neq('event_type', 'invalid')

    if (eventsError) {
      logDatabaseError(eventsError, 'Get total events count');
      throw eventsError
    }

    // Get events by source with source names
    const { data: eventsBySource, error: sourceError } = await supabase
      .from('events')
      .select(`
        source_id,
        event_sources (
          name
        )
      `)
      .neq('event_type', 'invalid')

    if (sourceError) {
      logDatabaseError(sourceError, 'Get events by source');
      throw sourceError
    }

    // Count events by source
    const sourceCounts: Record<string, number> = {}
    eventsBySource?.forEach(event => {
      const sourceName = event.event_sources?.name || 'Unknown Source'
      sourceCounts[sourceName] = (sourceCounts[sourceName] || 0) + 1
    })

    // Get recent events
    const { data: recentEvents, error: recentError } = await supabase
      .from('events')
      .select(`
        title,
        created_at,
        event_sources (
          name
        )
      `)
      .neq('event_type', 'invalid')
      .order('created_at', { ascending: false })
      .limit(10)

    if (recentError) {
      logDatabaseError(recentError, 'Get recent events');
      throw recentError
    }

    const stats = {
      totalEvents: totalEvents || 0,
      eventsBySource: sourceCounts,
      recentEvents: recentEvents?.map(event => ({
        title: event.title,
        source: event.event_sources?.name || 'Unknown',
        createdAt: event.created_at
      })) || [],
      timestamp: new Date().toISOString()
    }

    logSuccess('Get event statistics', { totalEvents, sourceCount: Object.keys(sourceCounts).length });

    return NextResponse.json(stats)
  } catch (error) {
    logApiError(error, 'GET /api/admin/events/stats');
    return NextResponse.json(
      {
        error: 'Failed to get event statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}