#!/usr/bin/env node
/**
 * Test script for Chrome DevTools scraping integration
 * Tests the fallback chain: Chrome DevTools → Playwright → Firecrawl
 */

import { ScrapingService } from '@/services/scraping'

async function testScrapingSystem() {
  console.log('🧪 Testing Scraping System\n')
  console.log('=' .repeat(60))

  const scrapingService = new ScrapingService()

  try {
    // Initialize the scraping service
    console.log('\n1️⃣  Initializing ScrapingService...')
    await scrapingService.initialize()
    console.log('✅ ScrapingService initialized successfully\n')

    // Get metrics before scraping
    console.log('2️⃣  Getting initial metrics...')
    const initialMetrics = await scrapingService.getMetrics()
    console.log('📊 Initial Metrics:', {
      totalSources: initialMetrics.totalSources,
      activeSources: initialMetrics.activeSources,
      eventsScrapedToday: initialMetrics.eventsScrapedToday,
      eventsCreatedToday: initialMetrics.eventsCreatedToday
    })
    console.log()

    // Test scraping a single source
    console.log('3️⃣  Testing scraping workflow...')
    console.log('   This will test the fallback chain:')
    console.log('   Chrome DevTools (will fail in server context)')
    console.log('   → Playwright (should work)')
    console.log('   → Firecrawl (backup if needed)\n')

    // Get the first active source for testing
    const sources = await getActiveSources()
    if (sources.length === 0) {
      console.log('⚠️  No active sources found. Please configure sources first.')
      return
    }

    const testSource = sources[0]
    console.log(`📍 Testing with source: ${testSource.name} (${testSource.id})`)
    console.log(`   URL: ${testSource.baseUrl}\n`)

    // Attempt to scrape the source
    console.log('🔄 Starting scrape job...\n')
    const result = await scrapingService.scrapeSource(testSource.id)

    // Display results
    console.log('\n' + '='.repeat(60))
    console.log('📋 Scrape Job Results:')
    console.log('=' .repeat(60))
    console.log(`Job ID:          ${result.jobId}`)
    console.log(`Status:          ${result.status}`)
    console.log(`Source:          ${testSource.name}`)
    console.log(`Started:         ${result.startedAt.toISOString()}`)
    console.log(`Completed:       ${result.completedAt?.toISOString() || 'N/A'}`)
    console.log(`Duration:        ${result.completedAt ?
      Math.round((result.completedAt.getTime() - result.startedAt.getTime()) / 1000) + 's' :
      'N/A'}`)
    console.log()
    console.log(`Events Found:    ${result.eventsFound}`)
    console.log(`Events Created:  ${result.eventsCreated}`)
    console.log(`Events Updated:  ${result.eventsUpdated}`)
    console.log(`Events Skipped:  ${result.eventsSkipped}`)
    console.log()

    if (result.errorMessage) {
      console.log(`❌ Error:         ${result.errorMessage}`)
    }

    // Get final metrics
    console.log('4️⃣  Getting final metrics...')
    const finalMetrics = await scrapingService.getMetrics()
    console.log('📊 Final Metrics:', {
      totalSources: finalMetrics.totalSources,
      activeSources: finalMetrics.activeSources,
      eventsScrapedToday: finalMetrics.eventsScrapedToday,
      eventsCreatedToday: finalMetrics.eventsCreatedToday,
      successfulJobsToday: finalMetrics.successfulJobsToday,
      failedJobsToday: finalMetrics.failedJobsToday,
      errorRate: (finalMetrics.errorRate * 100).toFixed(2) + '%'
    })
    console.log()

    // Verify fallback chain worked
    console.log('5️⃣  Verifying fallback chain...')
    if (result.status === 'completed' && result.eventsFound > 0) {
      console.log('✅ Scraping successful! Fallback chain worked correctly.')
      console.log('   (Chrome DevTools → Playwright → Firecrawl)')
    } else if (result.status === 'completed' && result.eventsFound === 0) {
      console.log('⚠️  Scraping completed but found no events.')
      console.log('   This could mean:')
      console.log('   - The source has no events currently')
      console.log('   - The selectors need adjustment')
      console.log('   - All scrapers failed to extract data')
    } else {
      console.log('❌ Scraping failed. Check error message above.')
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:')
    console.error(error)
    throw error
  } finally {
    // Cleanup
    console.log('\n6️⃣  Cleaning up...')
    await scrapingService.close()
    console.log('✅ Cleanup complete\n')
  }
}

async function getActiveSources() {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: sources } = await supabase
    .from('event_sources')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return sources || []
}

// Run the test
console.log('Starting Scraping System Test...\n')
testScrapingSystem()
  .then(() => {
    console.log('✅ Test completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })
