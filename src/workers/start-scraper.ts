#!/usr/bin/env node

import { scrapingScheduler } from '@/services/scraping/scheduler'
import { eventScraperWorker } from './event-scraper'

async function startScraper() {
  console.log('🚀 Starting Event Scraper Worker...')

  try {
    // Initialize the scheduler and worker
    await scrapingScheduler.initialize()

    // Start the scheduler
    scrapingScheduler.start()

    console.log('✅ Event Scraper Worker started successfully')
    console.log('📊 Worker Status:')
    console.log('   - Scheduler: Running')
    console.log('   - Queue: Processing jobs')
    console.log('   - Sources: Monitoring for updates')

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n📥 Received ${signal}, shutting down gracefully...`)

      try {
        scrapingScheduler.stop()
        await scrapingScheduler.destroy()
        console.log('✅ Scraper worker shut down successfully')
        process.exit(0)
      } catch (error) {
        console.error('❌ Error during shutdown:', error)
        process.exit(1)
      }
    }

    // Register shutdown handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGUSR2', () => shutdown('SIGUSR2')) // nodemon restart

    // Keep the process running
    process.on('uncaughtException', (error) => {
      console.error('🚨 Uncaught Exception:', error)
      shutdown('UNCAUGHT_EXCEPTION')
    })

    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason)
      shutdown('UNHANDLED_REJECTION')
    })

    // Log periodic status updates
    setInterval(async () => {
      try {
        const metrics = await scrapingScheduler.getMetrics()
        const queueStats = await eventScraperWorker.getQueueStats()

        console.log(`📊 Status Update: Active: ${queueStats.active}, Waiting: ${queueStats.waiting}, Failed: ${queueStats.failed}`)
      } catch (error) {
        console.error('Error getting status:', error)
      }
    }, 5 * 60 * 1000) // Every 5 minutes

  } catch (error) {
    console.error('❌ Failed to start Event Scraper Worker:', error)
    process.exit(1)
  }
}

// Start the scraper if this file is run directly
if (require.main === module) {
  startScraper().catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
}

export default startScraper