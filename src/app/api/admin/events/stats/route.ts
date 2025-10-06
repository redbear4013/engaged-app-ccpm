import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Get total events count
    const supabase = await createServerSupabaseClient();
    const { count: totalEvents, error: eventsError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .neq('event_type', 'invalid')

    if (eventsError) {
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

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error getting event stats:', error)
    return NextResponse.json(
      {
        error: 'Failed to get event statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}