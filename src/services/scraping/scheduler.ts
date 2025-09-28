import cron from 'node-cron'
import { eventScraperWorker } from '@/workers/event-scraper'
import { SourceManager } from './source-manager'
import { SCRAPING_CONFIG } from '@/config/scraping'

export class ScrapingScheduler {
  private sourceManager: SourceManager
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map()
  private isRunning = false

  constructor() {
    this.sourceManager = new SourceManager()
  }

  async initialize(): Promise<void> {
    try {
      await this.sourceManager.initialize()
      await eventScraperWorker.initialize()

      if (SCRAPING_CONFIG.scheduling.enableScheduler) {
        this.setupMainScheduler()
        this.setupHealthCheckScheduler()
        this.setupCleanupScheduler()
      }

      console.log('ScrapingScheduler initialized successfully')
    } catch (error) {
      console.error('Failed to initialize ScrapingScheduler:', error)
      throw error
    }
  }

  private setupMainScheduler(): void {
    // Main scheduler runs every 15 minutes to check for sources due for scraping
    const mainTask = cron.schedule(
      SCRAPING_CONFIG.scheduling.scheduleInterval,
      async () => {
        if (!this.isRunning) {
          await this.runScheduledScraping()
        }
      },
      {
        scheduled: false,
        name: 'main-scraper-scheduler'
      }
    )

    this.scheduledTasks.set('main', mainTask)
    console.log('Main scraping scheduler configured')
  }

  private setupHealthCheckScheduler(): void {
    // Health check every hour
    const healthTask = cron.schedule(
      '0 * * * *', // Every hour at minute 0
      async () => {
        await this.runHealthCheck()
      },
      {
        scheduled: false,
        name: 'health-check-scheduler'
      }
    )

    this.scheduledTasks.set('health', healthTask)
    console.log('Health check scheduler configured')
  }

  private setupCleanupScheduler(): void {
    // Cleanup old jobs daily at 2 AM
    const cleanupTask = cron.schedule(
      '0 2 * * *', // Daily at 2:00 AM
      async () => {
        await this.runCleanup()
      },
      {
        scheduled: false,
        name: 'cleanup-scheduler'
      }
    )

    this.scheduledTasks.set('cleanup', cleanupTask)
    console.log('Cleanup scheduler configured')
  }

  async runScheduledScraping(): Promise<void> {
    if (this.isRunning) {
      console.log('Scheduled scraping already running, skipping...')
      return
    }

    this.isRunning = true

    try {
      console.log('Running scheduled scraping check...')

      // Get sources that are due for scraping
      const sourcesDue = this.sourceManager.getSourcesDueForScraping()

      if (sourcesDue.length === 0) {
        console.log('No sources due for scraping')
        return
      }

      console.log(`Found ${sourcesDue.length} sources due for scraping`)

      // Check queue capacity
      const queueStats = await eventScraperWorker.getQueueStats()
      const totalPending = queueStats.waiting + queueStats.active + queueStats.delayed

      if (totalPending >= SCRAPING_CONFIG.scheduling.maxQueueSize) {
        console.warn(`Queue is full (${totalPending} jobs), skipping scheduled scraping`)
        return
      }

      // Add scraping jobs for each source
      const jobPromises = sourcesDue.map(source => {
        const priority = this.calculateSourcePriority(source)
        return eventScraperWorker.addScrapeSourceJob(
          source.id,
          source.name,
          { priority }
        )
      })

      const jobs = await Promise.all(jobPromises)
      console.log(`Added ${jobs.length} scraping jobs to queue`)

      // Update metrics
      await this.updateSchedulingMetrics(sourcesDue.length, jobs.length)

    } catch (error) {
      console.error('Error in scheduled scraping:', error)
    } finally {
      this.isRunning = false
    }
  }

  private calculateSourcePriority(source: any): number {
    const { priorityLevels } = SCRAPING_CONFIG.scheduling

    // High priority for sources with low error counts and frequent updates
    if (source.errorCount === 0 && source.scrapeFrequencyHours <= 6) {
      return priorityLevels.high
    }

    // Low priority for sources with errors
    if (source.errorCount > 3) {
      return priorityLevels.low
    }

    // Normal priority for everything else
    return priorityLevels.normal
  }

  async runHealthCheck(): Promise<void> {
    try {
      console.log('Running health check...')

      const healthCheckJob = await eventScraperWorker.addHealthCheckJob()
      const result = await healthCheckJob.finished()

      if (!result.healthy) {
        console.warn('Health check failed:', result.details)
        // Could send alerts here
      } else {
        console.log('Health check passed')
      }

    } catch (error) {
      console.error('Error in health check:', error)
    }
  }

  async runCleanup(): Promise<void> {
    try {
      console.log('Running queue cleanup...')

      // Clean completed jobs older than 24 hours
      const completedCleaned = await eventScraperWorker.cleanQueue(
        24 * 60 * 60 * 1000,
        'completed'
      )

      // Clean failed jobs older than 7 days
      const failedCleaned = await eventScraperWorker.cleanQueue(
        7 * 24 * 60 * 60 * 1000,
        'failed'
      )

      console.log(`Cleanup completed: ${completedCleaned.length} completed jobs, ${failedCleaned.length} failed jobs removed`)

    } catch (error) {
      console.error('Error in cleanup:', error)
    }
  }

  private async updateSchedulingMetrics(sourcesDue: number, jobsAdded: number): Promise<void> {
    // Could store scheduling metrics in database for monitoring
    const metrics = {
      timestamp: new Date().toISOString(),
      sourcesDue,
      jobsAdded,
      queueStats: await eventScraperWorker.getQueueStats()
    }

    console.log('Scheduling metrics:', metrics)
  }

  async scheduleSourceScraping(
    sourceId: string,
    sourceName: string,
    delayMinutes: number = 0
  ): Promise<void> {
    const delay = delayMinutes * 60 * 1000 // Convert to milliseconds

    try {
      await eventScraperWorker.addScrapeSourceJob(
        sourceId,
        sourceName,
        {
          delay,
          priority: SCRAPING_CONFIG.scheduling.priorityLevels.normal
        }
      )

      console.log(`Scheduled scraping for ${sourceName} with ${delayMinutes} minute delay`)
    } catch (error) {
      console.error(`Failed to schedule scraping for ${sourceName}:`, error)
      throw error
    }
  }

  async scheduleBulkScraping(delayMinutes: number = 0): Promise<void> {
    const delay = delayMinutes * 60 * 1000

    try {
      await eventScraperWorker.addScrapeAllSourcesJob({
        delay,
        priority: SCRAPING_CONFIG.scheduling.priorityLevels.high
      })

      console.log(`Scheduled bulk scraping with ${delayMinutes} minute delay`)
    } catch (error) {
      console.error('Failed to schedule bulk scraping:', error)
      throw error
    }
  }

  start(): void {
    console.log('Starting scraping scheduler...')

    for (const [name, task] of this.scheduledTasks) {
      task.start()
      console.log(`Started ${name} scheduler`)
    }

    console.log('Scraping scheduler started successfully')
  }

  stop(): void {
    console.log('Stopping scraping scheduler...')

    for (const [name, task] of this.scheduledTasks) {
      task.stop()
      console.log(`Stopped ${name} scheduler`)
    }

    this.isRunning = false
    console.log('Scraping scheduler stopped')
  }

  async restart(): Promise<void> {
    this.stop()
    await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
    this.start()
  }

  getScheduleStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {}

    for (const [name, task] of this.scheduledTasks) {
      status[name] = task.getStatus() === 'scheduled'
    }

    return status
  }

  async getMetrics(): Promise<{
    isRunning: boolean
    scheduledTasks: number
    activeSchedules: number
    lastRun?: Date
  }> {
    const scheduleStatus = this.getScheduleStatus()
    const activeCount = Object.values(scheduleStatus).filter(Boolean).length

    return {
      isRunning: this.isRunning,
      scheduledTasks: this.scheduledTasks.size,
      activeSchedules: activeCount,
      lastRun: this.isRunning ? new Date() : undefined
    }
  }

  async destroy(): Promise<void> {
    try {
      this.stop()
      this.scheduledTasks.clear()
      await eventScraperWorker.close()
      console.log('ScrapingScheduler destroyed successfully')
    } catch (error) {
      console.error('Error destroying ScrapingScheduler:', error)
    }
  }
}

// Export singleton instance
export const scrapingScheduler = new ScrapingScheduler()