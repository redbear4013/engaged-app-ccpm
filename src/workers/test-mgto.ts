#!/usr/bin/env node
/**
 * Test MGTO scraping - 48 events found but all skipped
 */

import { ScrapingService } from '@/services/scraping'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testMGTO() {
  console.log('🔍 Testing MGTO City Events Scraping\n')

  // Get MGTO source
  const { data: source } = await supabase
    .from('event_sources')
    .select('*')
    .ilike('name', '%MGTO%')
    .single()

  if (!source) {
    console.log('❌ MGTO source not found')
    return
  }

  console.log(`Found: ${source.name}`)
  console.log(`URL: ${source.base_url}\n`)

  // Initialize scraping service
  const scrapingService = new ScrapingService()
  await scrapingService.initialize()

  console.log('🚀 Starting scrape job...\n')
  const result = await scrapingService.scrapeSource(source.id)

  console.log('\n' + '='.repeat(80))
  console.log('📊 Result:')
  console.log(`Status: ${result.status}`)
  console.log(`Found: ${result.eventsFound}`)
  console.log(`Created: ${result.eventsCreated}`)
  console.log(`Skipped: ${result.eventsSkipped}`)
  if (result.errorMessage) console.log(`Error: ${result.errorMessage}`)
  console.log('='.repeat(80))

  await scrapingService.close()
}

testMGTO()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })
