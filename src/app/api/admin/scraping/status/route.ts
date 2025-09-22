import { NextRequest, NextResponse } from 'next/server'
import { ScrapingService } from '@/services/scraping'
import { eventScraperWorker } from '@/workers/event-scraper'
import { scrapingScheduler } from '@/services/scraping/scheduler'

export async function GET(request: NextRequest) {
  try {
    // Initialize services if needed
    const scrapingService = new ScrapingService()
    await scrapingService.initialize()

    // Get all metrics
    const [scrapingMetrics, queueStats, schedulerMetrics] = await Promise.all([
      scrapingService.getMetrics(),
      eventScraperWorker.getQueueStats(),
      scrapingScheduler.getMetrics()
    ])

    const status = {
      scraping: scrapingMetrics,
      queue: queueStats,
      scheduler: schedulerMetrics,
      timestamp: new Date().toISOString(),
      healthy: queueStats.failed < 10 && scrapingMetrics.errorRate < 0.2
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('Error getting scraping status:', error)
    return NextResponse.json(
      { error: 'Failed to get scraping status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'start-scheduler':
        scrapingScheduler.start()
        return NextResponse.json({ message: 'Scheduler started' })

      case 'stop-scheduler':
        scrapingScheduler.stop()
        return NextResponse.json({ message: 'Scheduler stopped' })

      case 'restart-scheduler':
        await scrapingScheduler.restart()
        return NextResponse.json({ message: 'Scheduler restarted' })

      case 'pause-queue':
        await eventScraperWorker.pauseQueue()
        return NextResponse.json({ message: 'Queue paused' })

      case 'resume-queue':
        await eventScraperWorker.resumeQueue()
        return NextResponse.json({ message: 'Queue resumed' })

      case 'retry-failed':
        await eventScraperWorker.retryFailedJobs()
        return NextResponse.json({ message: 'Failed jobs queued for retry' })

      case 'cleanup':
        const cleaned = await eventScraperWorker.cleanQueue()
        return NextResponse.json({
          message: 'Queue cleaned',
          removed: cleaned.length
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
      { error: 'Failed to perform action' },
      { status: 500 }
    )
  }
}