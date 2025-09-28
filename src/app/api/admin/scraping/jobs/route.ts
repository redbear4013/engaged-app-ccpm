import { NextRequest, NextResponse } from 'next/server'
import { eventScraperWorker } from '@/workers/event-scraper'
import { scrapingScheduler } from '@/services/scraping/scheduler'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let jobTypes: any = ['completed', 'failed', 'active', 'waiting', 'delayed']

    if (status !== 'all') {
      jobTypes = [status]
    }

    const jobs = await eventScraperWorker.getJobs(jobTypes, offset, offset + limit)

    const jobsData = await Promise.all(
      jobs.map(async (job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        opts: job.opts,
        progress: job.progress(),
        delay: job.delay,
        timestamp: job.timestamp,
        attemptsMade: job.attemptsMade,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
        returnvalue: job.returnvalue,
      }))
    )

    return NextResponse.json({
      jobs: jobsData,
      total: jobs.length
    })
  } catch (error) {
    console.error('Error getting jobs:', error)
    return NextResponse.json(
      { error: 'Failed to get jobs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ...options } = body

    let job
    switch (type) {
      case 'scrape-all':
        job = await eventScraperWorker.addScrapeAllSourcesJob(options)
        break

      case 'bulk-schedule':
        const { delayMinutes = 0 } = options
        await scrapingScheduler.scheduleBulkScraping(delayMinutes)
        return NextResponse.json({
          message: `Bulk scraping scheduled for ${delayMinutes} minutes`
        })

      case 'health-check':
        job = await eventScraperWorker.addHealthCheckJob()
        break

      default:
        return NextResponse.json(
          { error: 'Invalid job type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      message: 'Job queued successfully',
      jobId: job.id
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating job:', error)
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    )
  }
}