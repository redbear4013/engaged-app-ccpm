#!/usr/bin/env node
/**
 * Detailed scraping test to see what events are actually extracted
 */

import { EventScraper } from '@/services/scraping/scraper'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testDetailedScrape() {
  console.log('🔍 Detailed Scraping Test\n')

  // Get a test source
  const { data: sources } = await supabase
    .from('event_sources')
    .select('*')
    .eq('is_active', true)
    .limit(3)

  if (!sources || sources.length === 0) {
    console.log('❌ No sources found')
    return
  }

  const scraper = new EventScraper()
  await scraper.initialize()

  for (const source of sources) {
    console.log('\n' + '='.repeat(80))
    console.log(`Testing Source: ${source.name}`)
    console.log(`URL: ${source.base_url}`)
    console.log('='.repeat(80))

    try {
      const events = await scraper.scrapeEvents(
        source.base_url,
        source.scrape_config,
        source.id
      )

      console.log(`\n✅ Found ${events.length} events\n`)

      if (events.length > 0) {
        console.log('📋 Event Details:')
        events.forEach((event, i) => {
          console.log(`\n${i + 1}. ${event.title}`)
          console.log(`   Description: ${event.description?.substring(0, 100)}${event.description?.length > 100 ? '...' : ''}`)
          console.log(`   Start: ${event.startTime}`)
          console.log(`   Location: ${event.location}`)
          console.log(`   Price: ${event.price}`)
          console.log(`   Image: ${event.imageUrl}`)
          console.log(`   Source URL: ${event.sourceUrl}`)
        })

        // Try to create one event in database
        console.log('\n📝 Attempting to create first event in database...')
        const firstEvent = events[0]

        const eventData = {
          title: firstEvent.title,
          description: firstEvent.description,
          short_description: firstEvent.description?.substring(0, 200),
          start_time: firstEvent.startTime || new Date().toISOString(),
          source_url: firstEvent.sourceUrl,
          source_type: 'scraped',
          scrape_hash: firstEvent.scrapeHash,
          status: 'pending'
        }

        const { data, error } = await supabase
          .from('events')
          .insert([eventData])
          .select()

        if (error) {
          console.log('❌ Error creating event:', error)
        } else {
          console.log('✅ Event created successfully!')
          console.log('   Event ID:', data[0]?.id)
        }
      } else {
        console.log('⚠️  No events found')
        console.log('   Possible reasons:')
        console.log('   - Page structure changed')
        console.log('   - Selectors need updating')
        console.log('   - Site requires authentication')
        console.log('\n   Scrape Config:')
        console.log(JSON.stringify(source.scrape_config, null, 2))
      }

    } catch (error) {
      console.log('❌ Scraping failed:', error)
    }
  }

  await scraper.close()
  console.log('\n✅ Test complete')
}

testDetailedScrape()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })
