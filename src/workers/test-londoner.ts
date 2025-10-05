#!/usr/bin/env node
/**
 * Test Londoner Macao scraping with verbose logging
 */

import { ScrapingService } from '@/services/scraping'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testLondoner() {
  console.log('🔍 Testing Londoner Macao Scraping\n')

  // Get Londoner source
  const { data: sources } = await supabase
    .from('event_sources')
    .select('*')
    .ilike('name', '%Londoner%')
    .single()

  if (!sources) {
    console.log('❌ Londoner source not found')
    return
  }

  console.log(`Found source: ${sources.name}`)
  console.log(`URL: ${sources.base_url}`)
  console.log(`Config:`, JSON.stringify(sources.scrape_config, null, 2))
  console.log('\n' + '='.repeat(80) + '\n')

  // Initialize scraping service
  const scrapingService = new ScrapingService()
  await scrapingService.initialize()

  // Scrape Londoner
  console.log('🚀 Starting scrape job...\n')
  const result = await scrapingService.scrapeSource(sources.id)

  console.log('\n' + '='.repeat(80))
  console.log('📊 Scrape Job Result:')
  console.log('='.repeat(80))
  console.log(`Status: ${result.status}`)
  console.log(`Events Found: ${result.eventsFound}`)
  console.log(`Events Created: ${result.eventsCreated}`)
  console.log(`Events Updated: ${result.eventsUpdated}`)
  console.log(`Events Skipped: ${result.eventsSkipped}`)
  if (result.errorMessage) {
    console.log(`Error: ${result.errorMessage}`)
  }
  console.log('='.repeat(80))

  // Check database
  const { data: events, count } = await supabase
    .from('events')
    .select('id, title, start_time, venue_id', { count: 'exact' })
    .eq('source_type', 'scraped')
    .order('created_at', { ascending: false })
    .limit(5)

  console.log(`\n✅ Database now contains ${count} scraped events`)
  if (events && events.length > 0) {
    console.log('\n📋 Recent Events:')
    events.forEach((event, i) => {
      console.log(`${i + 1}. ${event.title}`)
      console.log(`   Start: ${event.start_time}`)
      console.log(`   Venue: ${event.venue_id || 'null'}`)
    })
  }

  await scrapingService.close()
}

testLondoner()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })
