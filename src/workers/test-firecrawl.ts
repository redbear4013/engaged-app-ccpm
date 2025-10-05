#!/usr/bin/env node

import { FirecrawlService } from '@/services/scraping/firecrawl'

async function testFirecrawl() {
  console.log('🔥 Testing Firecrawl API...\n')

  const firecrawl = new FirecrawlService()

  // Test with Hong Kong Tourism Board
  const url = 'https://www.discoverhongkong.com/us/see-do/events-festivals/'

  console.log(`Testing URL: ${url}\n`)

  try {
    const result = await firecrawl.extractStructuredData(url, {
      title: 'string',
      description: 'string',
      startTime: 'string',
      endTime: 'string',
      location: 'string',
      price: 'string',
    })

    console.log('\n✅ Firecrawl extraction successful!')
    console.log(`Found ${result.length} events:\n`)

    result.slice(0, 3).forEach((event, i) => {
      console.log(`Event ${i + 1}:`)
      console.log(`  Title: ${event.title}`)
      console.log(`  Location: ${event.location || 'N/A'}`)
      console.log(`  Date: ${event.startTime || 'N/A'}`)
      console.log()
    })

    if (result.length > 3) {
      console.log(`... and ${result.length - 3} more events`)
    }

  } catch (error) {
    console.error('❌ Firecrawl test failed:', error)
    process.exit(1)
  }
}

testFirecrawl()
