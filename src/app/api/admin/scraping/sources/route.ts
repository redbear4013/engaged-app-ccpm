import { NextRequest, NextResponse } from 'next/server'
import { SourceManager } from '@/services/scraping/source-manager'
import { eventScraperWorker } from '@/workers/event-scraper'

const sourceManager = new SourceManager()

export async function GET(request: NextRequest) {
  try {
    await sourceManager.initialize()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // active, inactive, all
    const type = searchParams.get('type') // website, api, manual

    let sources = sourceManager.getAllSources()

    // Filter by status
    if (status === 'active') {
      sources = sources.filter(s => s.isActive)
    } else if (status === 'inactive') {
      sources = sources.filter(s => !s.isActive)
    }

    // Filter by type
    if (type) {
      sources = sources.filter(s => s.sourceType === type)
    }

    return NextResponse.json({
      sources,
      total: sources.length
    })
  } catch (error) {
    console.error('Error getting sources:', error)
    return NextResponse.json(
      { error: 'Failed to get sources' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await sourceManager.initialize()
    const body = await request.json()

    const source = await sourceManager.createSource(body)

    return NextResponse.json({
      message: 'Source created successfully',
      source
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating source:', error)
    return NextResponse.json(
      { error: 'Failed to create source' },
      { status: 500 }
    )
  }
}