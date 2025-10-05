#!/usr/bin/env node
/**
 * Fix Londoner date extraction by parsing the composite location text
 * The scraped data looks like: "The Londoner Arena, The Londoner Macao 18 Oct 2025 (Sat) 8:00pm From MOP488"
 * We need to extract: venue, date, time, price separately
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Updated config with better selectors and custom extraction logic
const IMPROVED_LONDONER_CONFIG = {
  delay: 1000,
  waitFor: {
    timeout: 60000,
    selector: 'h3.two_columns-describe-text',
    networkIdle: false
  },
  rateLimit: '1 req/sec',
  selectors: {
    title: 'h3.two_columns-describe-text',
    // The description div contains: venue, date, time, price all together
    description: '.two_columns-describe-description',
    // These will be extracted via custom parsing in scraper
    startTime: '.two_columns-describe-description p',
    location: '.two_columns-describe-description p',
    price: '.two_columns-describe-description p',
    image: 'img[src*="sandsr"]',
    link: 'a[href*="/show/"]'
  },
  pagination: true,
  customExtraction: {
    // Parse composite text like: "The Londoner Arena, The Londoner Macao 18 Oct 2025 (Sat) 8:00pm From MOP488"
    parseEventDetails: true,
    datePattern: /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i,
    timePattern: /(\d{1,2}:\d{2}(?:am|pm))/i,
    pricePattern: /From\s+MOP\s*(\d+)/i,
    venuePattern: /^([^,]+),/
  }
}

async function updateLondonerConfig() {
  console.log('🔄 Updating Londoner configuration with improved extraction logic\n')

  const { data: sources } = await supabase
    .from('event_sources')
    .select('id, name')
    .ilike('name', '%Londoner%')
    .single()

  if (!sources) {
    console.log('❌ Londoner source not found')
    return
  }

  console.log(`Found: ${sources.name} (${sources.id})`)

  const { error } = await supabase
    .from('event_sources')
    .update({
      scrape_config: IMPROVED_LONDONER_CONFIG
    })
    .eq('id', sources.id)

  if (error) {
    console.log('❌ Update failed:', error)
    return
  }

  console.log('✅ Configuration updated with custom extraction logic!')
  console.log('\n📋 New config:')
  console.log(JSON.stringify(IMPROVED_LONDONER_CONFIG, null, 2))
}

updateLondonerConfig()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
