import { NextRequest, NextResponse } from 'next/server'
import { ScrapingService } from '@/services/scraping'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting scraping for all sources...')

    const scrapingService = new ScrapingService()
    await scrapingService.initialize()

    // Start scraping all sources
    const results = await scrapingService.scrapeAllSources()

    const summary = {
      totalSources: results.length,
      successful: results.filter(r => r.status === 'completed').length,
      failed: results.filter(r => r.status === 'failed').length,
      totalEventsFound: results.reduce((sum, r) => sum + r.eventsFound, 0),
      totalEventsCreated: results.reduce((sum, r) => sum + r.eventsCreated, 0),
      totalEventsUpdated: results.reduce((sum, r) => sum + r.eventsUpdated, 0),
      totalEventsSkipped: results.reduce((sum, r) => sum + r.eventsSkipped, 0),
      results: results.map(r => ({
        sourceId: r.sourceId,
        status: r.status,
        eventsFound: r.eventsFound,
        eventsCreated: r.eventsCreated,
        eventsUpdated: r.eventsUpdated,
        eventsSkipped: r.eventsSkipped,
        duration: r.completedAt && r.startedAt ?
          new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime() : 0,
        error: r.errorMessage
      }))
    }

    console.log(`✅ Scraping completed: ${summary.successful}/${summary.totalSources} sources successful`)

    return NextResponse.json({
      message: 'Scraping completed for all sources',
      success: true,
      summary
    })

  } catch (error) {
    console.error('Error starting scraping:', error)
    return NextResponse.json(
      {
        error: 'Failed to start scraping',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}