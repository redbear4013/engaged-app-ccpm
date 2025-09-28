import { NextRequest, NextResponse } from 'next/server'
import { ScrapingService } from '@/services/scraping'
import { SourceManager } from '@/services/scraping/source-manager'

export async function GET(request: NextRequest) {
  try {
    // Initialize services
    const scrapingService = new ScrapingService()
    const sourceManager = new SourceManager()

    await Promise.all([
      scrapingService.initialize(),
      sourceManager.initialize()
    ])

    // Get basic metrics without Bull
    const sources = sourceManager.getAllSources()
    const activeSources = sources.filter(s => s.isActive)

    const status = {
      scraping: {
        totalSources: sources.length,
        activeSources: activeSources.length,
        inactiveSources: sources.length - activeSources.length,
        lastScrapedAt: null, // Would need to query database for actual last scrape times
        errorRate: 0, // Simplified - would need to track this
      },
      queue: {
        waiting: 0, // No queue in simplified version
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0
      },
      scheduler: {
        running: false, // Simplified - no scheduler
        nextRun: null,
        intervalMinutes: null
      },
      timestamp: new Date().toISOString(),
      healthy: true // Simplified health check
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('Error getting scraping status:', error)
    return NextResponse.json(
      {
        error: 'Failed to get scraping status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    // Simplified actions without Bull queue
    switch (action) {
      case 'start-scheduler':
        return NextResponse.json({
          message: 'Scheduler not available in simplified mode. Use direct scraping endpoints instead.'
        })

      case 'stop-scheduler':
        return NextResponse.json({
          message: 'Scheduler not available in simplified mode.'
        })

      case 'restart-scheduler':
        return NextResponse.json({
          message: 'Scheduler not available in simplified mode.'
        })

      case 'pause-queue':
        return NextResponse.json({
          message: 'Queue not available in simplified mode.'
        })

      case 'resume-queue':
        return NextResponse.json({
          message: 'Queue not available in simplified mode.'
        })

      case 'retry-failed':
        return NextResponse.json({
          message: 'No failed jobs to retry in simplified mode.'
        })

      case 'cleanup':
        return NextResponse.json({
          message: 'No queue to clean in simplified mode.',
          removed: 0
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error performing scraping action:', error)
    return NextResponse.json(
      {
        error: 'Failed to perform action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}