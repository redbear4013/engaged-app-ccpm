import Bull from 'bull'
import { ScrapingService } from '@/services/scraping'
import { getRedis } from '@/lib/redis'
import { SCRAPING_CONFIG } from '@/config/scraping'
import type { ScrapeJobData, ScrapeJobResult } from '@/types/scraping'

export class EventScraperWorker {
  private queue: Bull.Queue<ScrapeJobData> | null = null
  private scrapingService: ScrapingService
  private isProcessing = false

  constructor() {
    this.scrapingService = new ScrapingService()

    // Skip Bull queue - Redis not available
    // To enable queue: sudo apt-get install redis-server && sudo service redis-server start
    console.warn('⚠️  Running scraper in DIRECT MODE (no Redis queue)')
    this.queue = null
  }
  async initialize(): Promise<void> {
    try {
      await this.scrapingService.initialize()
      console.log('EventScraperWorker initialized successfully')
    } catch (error) {
      console.error('Failed to initialize EventScraperWorker:', error)
      throw error
    }
  }

  private setupProcessors(): void {
    if (!this.queue) return

    // Process individual source scraping jobs
    this.queue.process('scrape-source', SCRAPING_CONFIG.queue.concurrency, async (job) => {
      return this.processScrapeSourceJob(job)
    })

    // Process bulk scraping jobs
    this.queue.process('scrape-all-sources', 1, async (job) => {
      return this.processScrapeAllSourcesJob(job)
    })

    // Process health check jobs
    this.queue.process('health-check', 1, async (job) => {
      return this.processHealthCheckJob(job)
    })
  }

  private setupEventHandlers(): void {
    if (!this.queue) return

    this.queue.on('ready', () => {
      console.log('Scraping queue is ready')
    })

    this.queue.on('error', (error) => {
      console.error('Scraping queue error:', error)
    })

    this.queue.on('waiting', (jobId) => {
      console.log(`Job ${jobId} is waiting`)
    })

    this.queue.on('active', (job, jobPromise) => {
      console.log(`Job ${job.id} started processing`)
    })

    this.queue.on('stalled', (job) => {
      console.warn(`Job ${job.id} stalled and will be retried`)
    })

    this.queue.on('progress', (job, progress) => {
      console.log(`Job ${job.id} progress: ${progress}%`)
    })

    this.queue.on('completed', (job, result) => {
      console.log(`Job ${job.id} completed successfully`)
    })

    this.queue.on('failed', (job, err) => {
      console.error(`Job ${job.id} failed:`, err.message)
    })

    this.queue.on('paused', () => {
      console.log('Scraping queue paused')
    })

    this.queue.on('resumed', () => {
      console.log('Scraping queue resumed')
    })

    this.queue.on('cleaned', (jobs, type) => {
      console.log(`Cleaned ${jobs.length} ${type} jobs from the queue`)
    })
  }

  private async processScrapeSourceJob(job: Bull.Job<ScrapeJobData>): Promise<ScrapeJobResult> {
    const { sourceId, sourceName } = job.data

    try {
      console.log(`Processing scrape job for source: ${sourceName} (${sourceId})`)

      // Update job progress
      await job.progress(10)

      // Perform the scraping
      const result = await this.scrapingService.scrapeSource(sourceId)

      // Update job progress
      await job.progress(90)

      // Log results
      console.log(`Scrape job completed for ${sourceName}:`, {
        eventsFound: result.eventsFound,
        eventsCreated: result.eventsCreated,
        eventsUpdated: result.eventsUpdated,
        eventsSkipped: result.eventsSkipped,
        status: result.status
      })

      await job.progress(100)
      return result

    } catch (error) {
      console.error(`Scrape job failed for ${sourceName}:`, error)
      throw error
    }
  }

  private async processScrapeAllSourcesJob(job: Bull.Job): Promise<ScrapeJobResult[]> {
    try {
      console.log('Processing bulk scrape job for all sources')

      await job.progress(10)

      const results = await this.scrapingService.scrapeAllSources()

      await job.progress(90)

      const summary = {
        totalSources: results.length,
        successful: results.filter(r => r.status === 'completed').length,
        failed: results.filter(r => r.status === 'failed').length,
        totalEventsFound: results.reduce((sum, r) => sum + r.eventsFound, 0),
        totalEventsCreated: results.reduce((sum, r) => sum + r.eventsCreated, 0),
        totalEventsUpdated: results.reduce((sum, r) => sum + r.eventsUpdated, 0),
      }

      console.log('Bulk scrape job completed:', summary)

      await job.progress(100)
      return results

    } catch (error) {
      console.error('Bulk scrape job failed:', error)
      throw error
    }
  }

  private async processHealthCheckJob(job: Bull.Job): Promise<{ healthy: boolean; details: any }> {
    try {
      console.log('Processing health check job')

      const metrics = await this.scrapingService.getMetrics()
      const queueStats = await this.getQueueStats()

      const healthy = queueStats.waiting < 100 && queueStats.failed < 10

      const details = {
        metrics,
        queue: queueStats,
        timestamp: new Date().toISOString()
      }

      console.log('Health check completed:', { healthy, details })

      return { healthy, details }

    } catch (error) {
      console.error('Health check failed:', error)
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  async addScrapeSourceJob(
    sourceId: string,
    sourceName: string,
    options: {
      priority?: number
      delay?: number
      attempts?: number
    } = {}
  ): Promise<Bull.Job<ScrapeJobData> | null> {
    if (!this.queue) {
      console.warn('EventScraperWorker: Queue unavailable, cannot add scrape source job')
      return null
    }
    const jobData: ScrapeJobData = {
      sourceId,
      sourceName,
      baseUrl: '', // Will be loaded from source manager
      config: {} as any, // Will be loaded from source manager
      priority: options.priority || SCRAPING_CONFIG.scheduling.priorityLevels.normal,
      retryCount: 0
    }

    const jobOptions: Bull.JobOptions = {
      priority: options.priority || SCRAPING_CONFIG.scheduling.priorityLevels.normal,
      delay: options.delay,
      attempts: options.attempts || SCRAPING_CONFIG.queue.defaultJobOptions.attempts,
      backoff: SCRAPING_CONFIG.queue.defaultJobOptions.backoff,
      removeOnComplete: SCRAPING_CONFIG.queue.defaultJobOptions.removeOnComplete,
      removeOnFail: SCRAPING_CONFIG.queue.defaultJobOptions.removeOnFail,
    }

    return this.queue.add('scrape-source', jobData, jobOptions)
  }

  async addScrapeAllSourcesJob(options: {
    delay?: number
    priority?: number
  } = {}): Promise<Bull.Job | null> {
    if (!this.queue) {
      console.warn('EventScraperWorker: Queue unavailable, cannot add scrape all sources job')
      return null
    }
    const jobOptions: Bull.JobOptions = {
      priority: options.priority || SCRAPING_CONFIG.scheduling.priorityLevels.normal,
      delay: options.delay,
      attempts: 3,
      backoff: 'exponential',
      removeOnComplete: 5,
      removeOnFail: 3,
    }

    return this.queue.add('scrape-all-sources', {}, jobOptions)
  }

  async addHealthCheckJob(): Promise<Bull.Job> {
    return this.queue.add('health-check', {}, {
      priority: SCRAPING_CONFIG.scheduling.priorityLevels.high,
      attempts: 1,
      removeOnComplete: 10,
      removeOnFail: 5,
    })
  }

  async getQueueStats(): Promise<{
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
    paused: number
  }> {
    if (!this.queue) {
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 }
    }
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      this.queue.getWaiting(),
      this.queue.getActive(),
      this.queue.getCompleted(),
      this.queue.getFailed(),
      this.queue.getDelayed(),
      this.queue.getPaused(),
    ])

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      paused: paused.length,
    }
  }

  async pauseQueue(): Promise<void> {
    await this.queue.pause()
    console.log('Scraping queue paused')
  }

  async resumeQueue(): Promise<void> {
    await this.queue.resume()
    console.log('Scraping queue resumed')
  }

  async cleanQueue(
    grace: number = 24 * 60 * 60 * 1000, // 24 hours
    type: 'completed' | 'failed' | 'active' | 'waiting' = 'completed'
  ): Promise<Bull.Job[]> {
    return this.queue.clean(grace, type)
  }

  async retryFailedJobs(): Promise<void> {
    const failedJobs = await this.queue.getFailed()
    console.log(`Retrying ${failedJobs.length} failed jobs`)

    for (const job of failedJobs) {
      await job.retry()
    }
  }

  async removeJob(jobId: string | number): Promise<void> {
    const job = await this.queue.getJob(jobId)
    if (job) {
      await job.remove()
      console.log(`Removed job ${jobId}`)
    }
  }

  async getJobById(jobId: string | number): Promise<Bull.Job | null> {
    return this.queue.getJob(jobId)
  }

  async getJobs(
    types: Bull.JobStatus | Bull.JobStatus[],
    start = 0,
    end = -1
  ): Promise<Bull.Job[]> {
    return this.queue.getJobs(types, start, end)
  }

  async close(): Promise<void> {
    try {
      await this.queue.close()
      await this.scrapingService.close()
      console.log('EventScraperWorker closed successfully')
    } catch (error) {
      console.error('Error closing EventScraperWorker:', error)
    }
  }

  // Direct scraping method for no-queue mode
  async scrapeSourceDirect(sourceId: string, sourceName: string): Promise<ScrapeJobResult | null> {
    if (this.queue) {
      console.warn('Queue exists, use addScrapeSourceJob instead')
      return null
    }

    console.log(`🔄 Direct scraping: ${sourceName} (${sourceId})`)
    
    try {
      const result = await this.scrapingService.scrapeSource(sourceId)
      console.log(`✅ Direct scrape completed: ${sourceName} - Found: ${result.eventsFound}, Created: ${result.eventsCreated}`)
      return result
    } catch (error) {
      console.error(`❌ Direct scrape failed: ${sourceName}`, error)
      return null
    }
  }

  isQueueMode(): boolean {
    return this.queue !== null
  }

  getQueue(): Bull.Queue<ScrapeJobData> | null {
    return this.queue
  }
}

// Export singleton instance
export const eventScraperWorker = new EventScraperWorker()
