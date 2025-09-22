import { NextRequest, NextResponse } from 'next/server'
import { SourceManager } from '@/services/scraping/source-manager'
import { eventScraperWorker } from '@/workers/event-scraper'
import { scrapingScheduler } from '@/services/scraping/scheduler'

const sourceManager = new SourceManager()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await sourceManager.initialize()

    const source = sourceManager.getActiveSource(params.id)
    if (!source) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ source })
  } catch (error) {
    console.error('Error getting source:', error)
    return NextResponse.json(
      { error: 'Failed to get source' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await sourceManager.initialize()
    const body = await request.json()

    const source = await sourceManager.updateSource(params.id, body)
    if (!source) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Source updated successfully',
      source
    })
  } catch (error) {
    console.error('Error updating source:', error)
    return NextResponse.json(
      { error: 'Failed to update source' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await sourceManager.initialize()

    const success = await sourceManager.deleteSource(params.id)
    if (!success) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Source deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting source:', error)
    return NextResponse.json(
      { error: 'Failed to delete source' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await sourceManager.initialize()
    const body = await request.json()
    const { action } = body

    const source = sourceManager.getActiveSource(params.id)
    if (!source) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      )
    }

    switch (action) {
      case 'scrape-now':
        const job = await eventScraperWorker.addScrapeSourceJob(
          params.id,
          source.name,
          { priority: 10 } // High priority for manual scraping
        )
        return NextResponse.json({
          message: 'Scraping job queued',
          jobId: job.id
        })

      case 'schedule-scraping':
        const { delayMinutes = 0 } = body
        await scrapingScheduler.scheduleSourceScraping(
          params.id,
          source.name,
          delayMinutes
        )
        return NextResponse.json({
          message: `Scraping scheduled for ${delayMinutes} minutes`
        })

      case 'activate':
        await sourceManager.activateSource(params.id)
        return NextResponse.json({
          message: 'Source activated'
        })

      case 'deactivate':
        await sourceManager.deactivateSource(params.id)
        return NextResponse.json({
          message: 'Source deactivated'
        })

      case 'reset-errors':
        await sourceManager.resetErrorCount(params.id)
        return NextResponse.json({
          message: 'Error count reset'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error performing source action:', error)
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    )
  }
}