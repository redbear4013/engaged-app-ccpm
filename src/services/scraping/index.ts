import type {
  EventSource,
  RawEventData,
  ScrapeJobData,
  ScrapeJobResult,
  ScrapingMetrics
} from '@/types/scraping'
import { EventScraper } from './scraper'
import { FirecrawlService } from './firecrawl'
import { SourceManager } from './source-manager'
import {
  generateEventHash,
  normalizeEventData,
  findSimilarEvents,
  calculateEventQualityScore,
  mergeEventData
} from '@/utils/deduplication'
import { createClient } from '@supabase/supabase-js'
import { SCRAPING_CONFIG } from '@/config/scraping'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export class ScrapingService {
  private scraper: EventScraper
  private firecrawl: FirecrawlService
  private sourceManager: SourceManager
  private isInitialized = false

  constructor() {
    this.scraper = new EventScraper()
    this.firecrawl = new FirecrawlService()
    this.sourceManager = new SourceManager()
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      console.log('Initializing ScrapingService...')

      await Promise.all([
        this.scraper.initialize(),
        this.sourceManager.initialize()
      ])

      this.isInitialized = true
      console.log('ScrapingService initialized successfully')
    } catch (error) {
      console.error('Failed to initialize ScrapingService:', error)
      throw error
    }
  }

  async scrapeSource(sourceId: string): Promise<ScrapeJobResult> {
    if (!this.isInitialized) {
      throw new Error('ScrapingService not initialized')
    }

    const source = this.sourceManager.getActiveSource(sourceId)
    if (!source) {
      throw new Error(`Source ${sourceId} not found or inactive`)
    }

    const jobResult: ScrapeJobResult = {
      jobId: crypto.randomUUID(),
      sourceId,
      status: 'running',
      startedAt: new Date(),
      eventsFound: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsSkipped: 0,
      retryCount: 0,
      jobMetadata: {}
    }

    try {
      console.log(`Starting scrape job for source: ${source.name}`)

      // Record job start in database
      await this.recordJobStart(jobResult, source)

      // Scrape events using both methods
      const events = await this.extractEvents(source)
      jobResult.eventsFound = events.length

      console.log(`Extracted ${events.length} events from ${source.name}`)

      if (events.length === 0) {
        jobResult.status = 'completed'
        jobResult.completedAt = new Date()
        await this.recordJobCompletion(jobResult)
        return jobResult
      }

      // Process and deduplicate events
      const processedEvents = await this.processEvents(events, source)

      jobResult.eventsCreated = processedEvents.created
      jobResult.eventsUpdated = processedEvents.updated
      jobResult.eventsSkipped = processedEvents.skipped

      // Update source status
      await this.sourceManager.updateLastScraped(sourceId)
      await this.sourceManager.resetErrorCount(sourceId)

      jobResult.status = 'completed'
      jobResult.completedAt = new Date()

      console.log(`Scrape job completed for ${source.name}: ${jobResult.eventsCreated} created, ${jobResult.eventsUpdated} updated, ${jobResult.eventsSkipped} skipped`)

    } catch (error) {
      console.error(`Scrape job failed for ${source.name}:`, error)

      jobResult.status = 'failed'
      jobResult.errorMessage = error instanceof Error ? error.message : String(error)
      jobResult.completedAt = new Date()

      // Update source error count
      await this.sourceManager.incrementErrorCount(sourceId, jobResult.errorMessage)
    }

    // Record job completion
    await this.recordJobCompletion(jobResult)
    return jobResult
  }

  async scrapeAllSources(): Promise<ScrapeJobResult[]> {
    const sources = this.sourceManager.getSourcesDueForScraping()
    console.log(`Scraping ${sources.length} sources due for update`)

    const results: ScrapeJobResult[] = []
    const concurrency = SCRAPING_CONFIG.scraping.maxConcurrentScrapes

    // Process sources in batches to respect concurrency limits
    for (let i = 0; i < sources.length; i += concurrency) {
      const batch = sources.slice(i, i + concurrency)
      const batchResults = await Promise.allSettled(
        batch.map(source => this.scrapeSource(source.id))
      )

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          console.error('Batch scrape error:', result.reason)
        }
      }

      // Add delay between batches to be respectful
      if (i + concurrency < sources.length) {
        await new Promise(resolve => setTimeout(resolve, SCRAPING_CONFIG.rateLimiting.delayBetweenRequests))
      }
    }

    return results
  }

  private async extractEvents(source: EventSource): Promise<RawEventData[]> {
    const allEvents: RawEventData[] = []

    try {
      // Try Playwright scraping first
      const playwrightEvents = await this.scraper.scrapeEvents(
        source.baseUrl,
        source.scrapeConfig,
        source.id
      )
      allEvents.push(...playwrightEvents)

      // If Playwright didn't find many events and Firecrawl is available, try it as backup
      if (playwrightEvents.length < 3 && this.firecrawl.isConfigured()) {
        console.log(`Trying Firecrawl as backup for ${source.name}`)
        const firecrawlEvents = await this.firecrawl.extractStructuredData(
          source.baseUrl,
          source.scrapeConfig,
          source.id
        )

        // Merge results, preferring Playwright data for duplicates
        for (const fcEvent of firecrawlEvents) {
          const isDuplicate = allEvents.some(pwEvent =>
            this.isEventSimilar(pwEvent, fcEvent)
          )
          if (!isDuplicate) {
            allEvents.push(fcEvent)
          }
        }
      }

    } catch (error) {
      console.error(`Error extracting events from ${source.name}:`, error)
    }

    // Normalize and add hashes to all events
    return allEvents.map(event => {
      const normalized = normalizeEventData(event)
      return {
        ...normalized,
        scrapeHash: generateEventHash(normalized)
      }
    })
  }

  private async processEvents(
    events: RawEventData[],
    source: EventSource
  ): Promise<{ created: number; updated: number; skipped: number }> {
    let created = 0
    let updated = 0
    let skipped = 0

    // Get existing events for deduplication
    const { data: existingEvents } = await supabase
      .from('events')
      .select('id, title, start_time, venue_id, scrape_hash')
      .eq('source_type', 'scraped')
      .gte('start_time', new Date().toISOString()) // Only future events

    const existingHashes = existingEvents?.map(e => e.scrape_hash).filter(Boolean) || []

    for (const event of events) {
      try {
        // Check for exact duplicate by hash
        if (existingHashes.includes(event.scrapeHash)) {
          skipped++
          continue
        }

        // Check for similar events using fuzzy matching
        const existingEventData: RawEventData[] = existingEvents?.map(e => ({
          title: e.title,
          startTime: e.start_time,
          location: '', // We'd need to join with venues table for full location
          sourceId: source.id,
          extractedAt: new Date(),
          scrapeHash: e.scrape_hash || ''
        })) || []

        const similarEvents = findSimilarEvents(event, existingEventData)

        if (similarEvents.length > 0 && similarEvents[0].confidence > 0.9) {
          // Update existing event
          await this.updateExistingEvent(similarEvents[0].eventId, event)
          updated++
        } else {
          // Create new event
          await this.createNewEvent(event, source)
          created++
        }

      } catch (error) {
        console.error('Error processing event:', error)
        skipped++
      }
    }

    return { created, updated, skipped }
  }

  private async createNewEvent(event: RawEventData, source: EventSource): Promise<void> {
    // Find or create venue
    let venueId: string | null = null
    if (event.location) {
      venueId = await this.findOrCreateVenue(event.location)
    }

    // Create event record
    const eventData = {
      title: event.title,
      description: event.description,
      short_description: event.description ?
        event.description.substring(0, 200) + (event.description.length > 200 ? '...' : '') :
        null,
      start_time: event.startTime ? new Date(event.startTime).toISOString() : new Date().toISOString(),
      end_time: event.endTime ? new Date(event.endTime).toISOString() : null,
      venue_id: venueId,
      poster_url: event.imageUrl,
      source_url: event.sourceUrl,
      source_type: 'scraped',
      scrape_hash: event.scrapeHash,
      last_scraped_at: event.extractedAt.toISOString(),
      quality_score: calculateEventQualityScore(event),
      status: 'pending' // Will be reviewed before publishing
    }

    const { error } = await supabase
      .from('events')
      .insert([eventData])

    if (error) {
      console.error('Error creating event:', error)
      throw error
    }
  }

  private async updateExistingEvent(eventId: string, event: RawEventData): Promise<void> {
    const updateData = {
      description: event.description,
      poster_url: event.imageUrl,
      source_url: event.sourceUrl,
      last_scraped_at: event.extractedAt.toISOString(),
      quality_score: calculateEventQualityScore(event),
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)

    if (error) {
      console.error('Error updating event:', error)
      throw error
    }
  }

  private async findOrCreateVenue(location: string): Promise<string | null> {
    // Try to find existing venue
    const { data: existingVenues } = await supabase
      .from('venues')
      .select('id')
      .ilike('name', `%${location}%`)
      .limit(1)

    if (existingVenues && existingVenues.length > 0) {
      return existingVenues[0].id
    }

    // Create new venue
    const venueData = {
      name: location,
      slug: location.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      address: location,
      city: 'Macau', // Default city
      is_verified: false
    }

    const { data, error } = await supabase
      .from('venues')
      .insert([venueData])
      .select('id')
      .single()

    if (error) {
      console.error('Error creating venue:', error)
      return null
    }

    return data?.id || null
  }

  private async recordJobStart(job: ScrapeJobResult, source: EventSource): Promise<void> {
    const jobData = {
      id: job.jobId,
      source_id: source.id,
      status: job.status,
      started_at: job.startedAt.toISOString(),
      events_found: job.eventsFound,
      events_created: job.eventsCreated,
      events_updated: job.eventsUpdated,
      events_skipped: job.eventsSkipped,
      retry_count: job.retryCount,
      job_metadata: job.jobMetadata
    }

    await supabase.from('scrape_jobs').insert([jobData])
  }

  private async recordJobCompletion(job: ScrapeJobResult): Promise<void> {
    const updateData = {
      status: job.status,
      completed_at: job.completedAt?.toISOString(),
      events_found: job.eventsFound,
      events_created: job.eventsCreated,
      events_updated: job.eventsUpdated,
      events_skipped: job.eventsSkipped,
      error_message: job.errorMessage,
      retry_count: job.retryCount
    }

    await supabase
      .from('scrape_jobs')
      .update(updateData)
      .eq('id', job.jobId)
  }

  private isEventSimilar(event1: RawEventData, event2: RawEventData): boolean {
    const titleSim = event1.title.toLowerCase() === event2.title.toLowerCase()
    const timeSim = event1.startTime === event2.startTime
    return titleSim || timeSim
  }

  async getMetrics(): Promise<ScrapingMetrics> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [sourceMetrics, jobMetrics] = await Promise.all([
      this.sourceManager.getMetrics(),
      this.getJobMetrics(today)
    ])

    return {
      totalSources: sourceMetrics.totalSources,
      activeSources: sourceMetrics.activeSources,
      totalJobsToday: jobMetrics.totalJobs,
      successfulJobsToday: jobMetrics.successfulJobs,
      failedJobsToday: jobMetrics.failedJobs,
      eventsScrapedToday: jobMetrics.eventsFound,
      eventsCreatedToday: jobMetrics.eventsCreated,
      averageJobDuration: jobMetrics.averageDuration,
      errorRate: jobMetrics.totalJobs > 0 ? jobMetrics.failedJobs / jobMetrics.totalJobs : 0,
      lastSuccessfulScrape: jobMetrics.lastSuccessfulScrape
    }
  }

  private async getJobMetrics(since: Date) {
    const { data: jobs } = await supabase
      .from('scrape_jobs')
      .select('*')
      .gte('started_at', since.toISOString())

    const totalJobs = jobs?.length || 0
    const successfulJobs = jobs?.filter(j => j.status === 'completed').length || 0
    const failedJobs = jobs?.filter(j => j.status === 'failed').length || 0
    const eventsFound = jobs?.reduce((sum, j) => sum + (j.events_found || 0), 0) || 0
    const eventsCreated = jobs?.reduce((sum, j) => sum + (j.events_created || 0), 0) || 0

    const completedJobs = jobs?.filter(j => j.completed_at) || []
    const durations = completedJobs.map(j =>
      new Date(j.completed_at).getTime() - new Date(j.started_at).getTime()
    )
    const averageDuration = durations.length > 0 ?
      durations.reduce((sum, d) => sum + d, 0) / durations.length : 0

    const lastSuccessful = jobs?.filter(j => j.status === 'completed')
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0]

    return {
      totalJobs,
      successfulJobs,
      failedJobs,
      eventsFound,
      eventsCreated,
      averageDuration,
      lastSuccessfulScrape: lastSuccessful ? new Date(lastSuccessful.completed_at) : undefined
    }
  }

  async close(): Promise<void> {
    await this.scraper.close()
  }
}