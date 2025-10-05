'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface ScrapeJob {
  id: string
  source_id: string
  status: string
  started_at: string
  completed_at?: string
  events_found: number
  events_created: number
  events_updated: number
  events_skipped: number
  error_message?: string
}

interface EventSource {
  id: string
  name: string
  base_url: string
  is_active: boolean
  last_scraped_at?: string
  error_count: number
}

export default function ScrapingDashboard() {
  const [jobs, setJobs] = useState<ScrapeJob[]>([])
  const [sources, setSources] = useState<EventSource[]>([])
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    try {
      const [jobsData, sourcesData] = await Promise.all([
        supabase
          .from('scrape_jobs')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(20),
        supabase
          .from('event_sources')
          .select('*')
          .order('name', { ascending: true })
      ])

      if (jobsData.data) setJobs(jobsData.data)
      if (sourcesData.data) setSources(sourcesData.data)
      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  async function handleScrape(sourceId: string) {
    setScraping(prev => ({ ...prev, [sourceId]: true }))

    try {
      const response = await fetch('/api/admin/scraping/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId })
      })

      if (!response.ok) throw new Error('Scraping failed')

      await loadData()
    } catch (error) {
      console.error('Error starting scrape:', error)
      alert('Failed to start scraping')
    } finally {
      setScraping(prev => ({ ...prev, [sourceId]: false }))
    }
  }

  function formatDuration(started: string, completed?: string) {
    if (!completed) return 'Running...'
    const duration = new Date(completed).getTime() - new Date(started).getTime()
    return `${Math.round(duration / 1000)}s`
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  const stats = jobs.reduce(
    (acc, job) => ({
      total: acc.total + 1,
      successful: acc.successful + (job.status === 'completed' ? 1 : 0),
      failed: acc.failed + (job.status === 'failed' ? 1 : 0),
      eventsFound: acc.eventsFound + job.events_found,
      eventsCreated: acc.eventsCreated + job.events_created,
    }),
    { total: 0, successful: 0, failed: 0, eventsFound: 0, eventsCreated: 0 }
  )

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Scraping Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Jobs</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-green-50 p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Successful</div>
          <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
        </div>
        <div className="bg-red-50 p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Failed</div>
          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Events Found</div>
          <div className="text-2xl font-bold text-blue-600">{stats.eventsFound}</div>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Events Created</div>
          <div className="text-2xl font-bold text-purple-600">{stats.eventsCreated}</div>
        </div>
      </div>

      {/* Sources */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Event Sources</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Scraped</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Errors</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sources.map((source) => (
                <tr key={source.id} className={!source.is_active ? 'opacity-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{source.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{source.base_url}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {source.last_scraped_at
                      ? new Date(source.last_scraped_at).toLocaleString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs ${source.error_count > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {source.error_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs ${source.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {source.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleScrape(source.id)}
                      disabled={!source.is_active || scraping[source.id]}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {scraping[source.id] ? 'Scraping...' : 'Scrape Now'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Recent Scrape Jobs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Found</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skipped</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(job.started_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {formatDuration(job.started_at, job.completed_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{job.events_found}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                    {job.events_created}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                    {job.events_updated}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {job.events_skipped}
                  </td>
                  <td className="px-6 py-4 text-sm text-red-600">
                    {job.error_message || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
