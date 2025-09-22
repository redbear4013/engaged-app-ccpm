#!/usr/bin/env node

import { ScrapingService } from '@/services/scraping'
import { eventScraperWorker } from './event-scraper'
import { scrapingScheduler } from '@/services/scraping/scheduler'

async function performHealthCheck() {
  console.log('🏥 Performing Event Scraper Health Check...')

  const results = {
    timestamp: new Date().toISOString(),
    overall: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    components: {
      scrapingService: { status: 'unknown' as 'healthy' | 'degraded' | 'unhealthy', details: {} },
      queue: { status: 'unknown' as 'healthy' | 'degraded' | 'unhealthy', details: {} },
      scheduler: { status: 'unknown' as 'healthy' | 'degraded' | 'unhealthy', details: {} },
      redis: { status: 'unknown' as 'healthy' | 'degraded' | 'unhealthy', details: {} }
    },
    metrics: {} as any,
    recommendations: [] as string[]
  }

  try {
    // Check Scraping Service
    console.log('📊 Checking Scraping Service...')
    const scrapingService = new ScrapingService()
    await scrapingService.initialize()

    const metrics = await scrapingService.getMetrics()
    results.metrics = metrics

    if (metrics.errorRate > 0.5) {
      results.components.scrapingService.status = 'unhealthy'
      results.recommendations.push('High error rate detected - check source configurations')
    } else if (metrics.errorRate > 0.2) {
      results.components.scrapingService.status = 'degraded'
      results.recommendations.push('Elevated error rate - monitor source health')
    } else {
      results.components.scrapingService.status = 'healthy'
    }

    results.components.scrapingService.details = {
      totalSources: metrics.totalSources,
      activeSources: metrics.activeSources,
      errorRate: metrics.errorRate,
      eventsScrapedToday: metrics.eventsScrapedToday
    }

    // Check Queue Health
    console.log('🔄 Checking Queue Health...')
    await eventScraperWorker.initialize()
    const queueStats = await eventScraperWorker.getQueueStats()

    if (queueStats.failed > 20 || queueStats.waiting > 100) {
      results.components.queue.status = 'unhealthy'
      if (queueStats.failed > 20) {
        results.recommendations.push(`High number of failed jobs: ${queueStats.failed}`)
      }
      if (queueStats.waiting > 100) {
        results.recommendations.push(`Queue backlog detected: ${queueStats.waiting} waiting jobs`)
      }
    } else if (queueStats.failed > 10 || queueStats.waiting > 50) {
      results.components.queue.status = 'degraded'
      results.recommendations.push('Monitor queue performance')
    } else {
      results.components.queue.status = 'healthy'
    }

    results.components.queue.details = queueStats

    // Check Scheduler Health
    console.log('⏰ Checking Scheduler Health...')
    await scrapingScheduler.initialize()
    const schedulerMetrics = await scrapingScheduler.getMetrics()

    if (!schedulerMetrics.isRunning || schedulerMetrics.activeSchedules === 0) {
      results.components.scheduler.status = 'unhealthy'
      results.recommendations.push('Scheduler is not running properly')
    } else {
      results.components.scheduler.status = 'healthy'
    }

    results.components.scheduler.details = schedulerMetrics

    // Check Redis Connection
    console.log('📊 Checking Redis Connection...')
    try {
      const { isRedisConnected } = await import('@/lib/redis')
      if (isRedisConnected()) {
        results.components.redis.status = 'healthy'
      } else {
        results.components.redis.status = 'unhealthy'
        results.recommendations.push('Redis connection is down')
      }
    } catch (error) {
      results.components.redis.status = 'unhealthy'
      results.components.redis.details = { error: error instanceof Error ? error.message : String(error) }
      results.recommendations.push('Redis connection failed')
    }

    // Determine overall health
    const componentStatuses = Object.values(results.components).map(c => c.status)

    if (componentStatuses.includes('unhealthy')) {
      results.overall = 'unhealthy'
    } else if (componentStatuses.includes('degraded')) {
      results.overall = 'degraded'
    } else {
      results.overall = 'healthy'
    }

    await scrapingService.close()

  } catch (error) {
    console.error('❌ Health check failed:', error)
    results.overall = 'unhealthy'
    results.recommendations.push(`Health check error: ${error instanceof Error ? error.message : String(error)}`)
  }

  // Output results
  console.log('\n📋 Health Check Results:')
  console.log(`Overall Status: ${results.overall.toUpperCase()}`)
  console.log('\nComponent Status:')

  for (const [component, data] of Object.entries(results.components)) {
    const status = data.status.toUpperCase()
    const icon = data.status === 'healthy' ? '✅' : data.status === 'degraded' ? '⚠️' : '❌'
    console.log(`  ${icon} ${component}: ${status}`)
  }

  if (results.recommendations.length > 0) {
    console.log('\n💡 Recommendations:')
    results.recommendations.forEach(rec => console.log(`  - ${rec}`))
  }

  console.log('\n📊 Key Metrics:')
  if (results.metrics.totalSources) {
    console.log(`  - Total Sources: ${results.metrics.totalSources}`)
    console.log(`  - Active Sources: ${results.metrics.activeSources}`)
    console.log(`  - Error Rate: ${(results.metrics.errorRate * 100).toFixed(1)}%`)
    console.log(`  - Events Scraped Today: ${results.metrics.eventsScrapedToday}`)
  }

  // Output JSON for programmatic use
  if (process.argv.includes('--json')) {
    console.log('\n📄 JSON Output:')
    console.log(JSON.stringify(results, null, 2))
  }

  // Exit with appropriate code
  const exitCode = results.overall === 'healthy' ? 0 : results.overall === 'degraded' ? 1 : 2
  process.exit(exitCode)
}

// Run health check if this file is executed directly
if (require.main === module) {
  performHealthCheck().catch((error) => {
    console.error('❌ Health check failed:', error)
    process.exit(2)
  })
}

export default performHealthCheck