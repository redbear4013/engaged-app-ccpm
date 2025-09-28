import { NextRequest, NextResponse } from 'next/server'
import { SourceManager } from '@/services/scraping/source-manager'
import { ScrapingService } from '@/services/scraping'

const sourceManager = new SourceManager()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    await sourceManager.initialize()

    const source = sourceManager.getActiveSource(resolvedParams.id)
    if (!source) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      )
    }

    // Perform direct test scraping without Bull queue for development
    const scrapingService = new ScrapingService()
    await scrapingService.initialize()

    console.log(`🧪 Testing scraping for source: ${source.name}`)

    // Test scraping directly
    const testResult = await scrapingService.scrapeSource(resolvedParams.id)

    return NextResponse.json({
      message: `Test scraping completed for ${source.name}`,
      success: true,
      source: {
        id: source.id,
        name: source.name,
        url: source.url || source.baseUrl,
        isActive: source.isActive
      },
      results: {
        eventsFound: testResult.eventsFound || 0,
        eventsCreated: testResult.eventsCreated || 0,
        eventsUpdated: testResult.eventsUpdated || 0,
        eventsSkipped: testResult.eventsSkipped || 0,
        status: testResult.status,
        duration: testResult.completedAt && testResult.startedAt ?
          new Date(testResult.completedAt).getTime() - new Date(testResult.startedAt).getTime() : 0
      }
    })
  } catch (error) {
    console.error('Error testing source:', error)
    return NextResponse.json(
      {
        error: 'Failed to test scraping',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}