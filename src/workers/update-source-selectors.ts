#!/usr/bin/env node
/**
 * Update source selectors based on inspected page structure
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Updated selectors based on Chrome DevTools inspection
// Each event has 3 paragraphs: p:nth-of-type(1) = venue, p:nth-of-type(2) = date+time, p:nth-of-type(3) = price
const LONDONER_SELECTORS = {
  title: 'h3.two_columns-describe-text',
  location: '.two_columns-describe-description p:nth-of-type(1)',
  startTime: '.two_columns-describe-description p:nth-of-type(2)',
  price: '.two_columns-describe-description p:nth-of-type(3)',
  description: '.two_columns-describe-description',
  image: 'img[src*="sandsr"]',
  link: 'a[href*="/show/"]'
}

interface SourceSelectors {
  sourceId: string
  selectors: {
    title: string
    description?: string
    startTime?: string
    endTime?: string
    location?: string
    price?: string
    image?: string
    link?: string
  }
  waitFor?: {
    selector?: string
    timeout?: number
    networkIdle?: boolean
  }
}

async function updateSelectors(config: SourceSelectors) {
  const { sourceId, selectors, waitFor } = config

  const updateData: any = {
    config: {
      selectors,
      ...(waitFor && { waitFor })
    }
  }

  const { data, error } = await supabase
    .from('event_sources')
    .update(updateData)
    .eq('id', sourceId)
    .select()

  if (error) {
    console.error(`❌ Failed to update source ${sourceId}:`, error)
    return false
  }

  console.log(`✅ Updated selectors for source ${sourceId}:`, data)
  return true
}

// Export for use in other scripts
export { updateSelectors }

// Update Londoner Macao source with corrected selectors
async function updateLondonerSource() {
  console.log('🔄 Updating Londoner Macao selectors...\n')

  // Find the Londoner source
  const { data: sources } = await supabase
    .from('event_sources')
    .select('id, name, scrape_config')
    .ilike('name', '%Londoner%')

  if (!sources || sources.length === 0) {
    console.log('❌ Londoner source not found')
    return
  }

  const source = sources[0]
  console.log(`Found source: ${source.name} (${source.id})`)

  // Update with corrected selectors
  const { error } = await supabase
    .from('event_sources')
    .update({
      scrape_config: {
        delay: 1000,
        rateLimit: '1 req/sec',
        pagination: true,
        selectors: LONDONER_SELECTORS,
        waitFor: {
          selector: 'h3.two_columns-describe-text',
          timeout: 60000,
          networkIdle: false
        }
      }
    })
    .eq('id', source.id)

  if (error) {
    console.log('❌ Update failed:', error)
  } else {
    console.log('✅ Londoner selectors updated successfully!')
  }
}

// Run if executed directly
if (require.main === module) {
  updateLondonerSource()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error)
      process.exit(1)
    })
}
