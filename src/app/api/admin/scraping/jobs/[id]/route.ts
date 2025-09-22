import { NextRequest, NextResponse } from 'next/server'
import { eventScraperWorker } from '@/workers/event-scraper'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = await eventScraperWorker.getJobById(params.id)
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const jobData = {
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
      logs: await job.getState() === 'completed' || await job.getState() === 'failed' ?
        job.stacktrace : undefined,
    }

    return NextResponse.json({ job: jobData })
  } catch (error) {
    console.error('Error getting job:', error)
    return NextResponse.json(
      { error: 'Failed to get job' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await eventScraperWorker.removeJob(params.id)
    return NextResponse.json({
      message: 'Job removed successfully'
    })
  } catch (error) {
    console.error('Error removing job:', error)
    return NextResponse.json(
      { error: 'Failed to remove job' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { action } = body

    const job = await eventScraperWorker.getJobById(params.id)
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    switch (action) {
      case 'retry':
        await job.retry()
        return NextResponse.json({
          message: 'Job queued for retry'
        })

      case 'remove':
        await job.remove()
        return NextResponse.json({
          message: 'Job removed'
        })

      case 'promote':
        await job.promote()
        return NextResponse.json({
          message: 'Job promoted'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error performing job action:', error)
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    )
  }
}