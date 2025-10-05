#!/usr/bin/env node
/**
 * Find sources that found events but skipped them
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function findSkippedSources() {
  console.log('🔍 Finding sources with skipped events...\n')

  // Find jobs where events were found but skipped
  const { data: jobs } = await supabase
    .from('scrape_jobs')
    .select('source_id, events_found, events_skipped, events_created, error_message, started_at')
    .gt('events_found', 0)
    .gt('events_skipped', 0)
    .order('started_at', { ascending: false })
    .limit(20)

  if (!jobs || jobs.length === 0) {
    console.log('✅ No jobs found with skipped events')
    return
  }

  // Get source names
  const sourceIds = [...new Set(jobs.map(j => j.source_id))]
  const { data: sources } = await supabase
    .from('event_sources')
    .select('id, name, base_url')
    .in('id', sourceIds)

  const sourceMap = Object.fromEntries(sources?.map(s => [s.id, s]) || [])

  console.log('📊 Sources with Found but Skipped Events:\n')

  // Group by source
  const grouped = jobs.reduce((acc, job) => {
    if (!acc[job.source_id]) acc[job.source_id] = []
    acc[job.source_id].push(job)
    return acc
  }, {} as Record<string, typeof jobs>)

  Object.entries(grouped).forEach(([sourceId, sourceJobs]) => {
    const source = sourceMap[sourceId]
    console.log(`\n${source.name}:`)
    console.log(`  URL: ${source.base_url}`)
    console.log(`  Recent Jobs:`)
    sourceJobs.forEach(job => {
      console.log(`    - Found: ${job.events_found}, Created: ${job.events_created}, Skipped: ${job.events_skipped}`)
      if (job.error_message) console.log(`      Error: ${job.error_message}`)
    })
  })

  console.log('\n' + '='.repeat(80))
  console.log('\nSources needing fixes:', Object.keys(grouped).length)
}

findSkippedSources()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
