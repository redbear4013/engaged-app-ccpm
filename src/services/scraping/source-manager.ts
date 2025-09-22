import fs from 'fs/promises'
import path from 'path'
import type { EventSource, ScrapingConfig } from '@/types/scraping'
import { createClient } from '@supabase/supabase-js'
import sourceConfig from '@/config/sources.json'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export class SourceManager {
  private sources: Map<string, EventSource> = new Map()
  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      await this.loadSourcesFromDatabase()
      await this.syncWithConfigFile()
      this.initialized = true
      console.log(`SourceManager initialized with ${this.sources.size} sources`)
    } catch (error) {
      console.error('Failed to initialize SourceManager:', error)
      throw error
    }
  }

  async loadSourcesFromDatabase(): Promise<void> {
    try {
      const { data: sources, error } = await supabase
        .from('event_sources')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading sources from database:', error)
        return
      }

      this.sources.clear()
      for (const source of sources || []) {
        this.sources.set(source.id, this.transformDatabaseSource(source))
      }
    } catch (error) {
      console.error('Failed to load sources from database:', error)
    }
  }

  async syncWithConfigFile(): Promise<void> {
    try {
      // Load sources from config file
      const configSources = sourceConfig.sources

      for (const configSource of configSources) {
        const existingSource = this.sources.get(configSource.id)

        if (!existingSource) {
          // Create new source in database
          await this.createSource(configSource)
        } else {
          // Update existing source if configuration changed
          await this.updateSourceIfChanged(existingSource, configSource)
        }
      }
    } catch (error) {
      console.error('Failed to sync with config file:', error)
    }
  }

  async createSource(sourceData: Partial<EventSource>): Promise<EventSource> {
    const now = new Date()
    const source: EventSource = {
      id: sourceData.id || crypto.randomUUID(),
      name: sourceData.name || '',
      baseUrl: sourceData.baseUrl || '',
      sourceType: sourceData.sourceType || 'website',
      scrapeConfig: sourceData.scrapeConfig || {} as ScrapingConfig,
      scrapeFrequencyHours: sourceData.scrapeFrequencyHours || 24,
      isActive: sourceData.isActive ?? true,
      errorCount: 0,
      createdAt: now,
      updatedAt: now,
    }

    // Calculate next scrape time
    source.nextScrapeAt = new Date(now.getTime() + source.scrapeFrequencyHours * 60 * 60 * 1000)

    try {
      const { error } = await supabase
        .from('event_sources')
        .insert([this.transformSourceForDatabase(source)])

      if (error) {
        console.error('Error creating source in database:', error)
        throw error
      }

      this.sources.set(source.id, source)
      console.log(`Created new source: ${source.name}`)
      return source
    } catch (error) {
      console.error('Failed to create source:', error)
      throw error
    }
  }

  async updateSource(sourceId: string, updates: Partial<EventSource>): Promise<EventSource | null> {
    const existingSource = this.sources.get(sourceId)
    if (!existingSource) {
      console.warn(`Source ${sourceId} not found`)
      return null
    }

    const updatedSource: EventSource = {
      ...existingSource,
      ...updates,
      updatedAt: new Date(),
    }

    try {
      const { error } = await supabase
        .from('event_sources')
        .update(this.transformSourceForDatabase(updatedSource))
        .eq('id', sourceId)

      if (error) {
        console.error('Error updating source in database:', error)
        throw error
      }

      this.sources.set(sourceId, updatedSource)
      console.log(`Updated source: ${updatedSource.name}`)
      return updatedSource
    } catch (error) {
      console.error('Failed to update source:', error)
      throw error
    }
  }

  async deactivateSource(sourceId: string): Promise<boolean> {
    const source = await this.updateSource(sourceId, { isActive: false })
    return !!source
  }

  async activateSource(sourceId: string): Promise<boolean> {
    const source = await this.updateSource(sourceId, { isActive: true })
    return !!source
  }

  async incrementErrorCount(sourceId: string, errorMessage?: string): Promise<void> {
    const source = this.sources.get(sourceId)
    if (!source) return

    const updates: Partial<EventSource> = {
      errorCount: source.errorCount + 1,
      lastError: errorMessage,
    }

    // Deactivate source if too many errors
    if (updates.errorCount! >= 10) {
      updates.isActive = false
      console.warn(`Deactivating source ${source.name} due to too many errors`)
    }

    await this.updateSource(sourceId, updates)
  }

  async resetErrorCount(sourceId: string): Promise<void> {
    await this.updateSource(sourceId, {
      errorCount: 0,
      lastError: undefined,
    })
  }

  async updateLastScraped(sourceId: string): Promise<void> {
    const source = this.sources.get(sourceId)
    if (!source) return

    const now = new Date()
    const nextScrape = new Date(now.getTime() + source.scrapeFrequencyHours * 60 * 60 * 1000)

    await this.updateSource(sourceId, {
      lastScrapedAt: now,
      nextScrapeAt: nextScrape,
    })
  }

  getActiveSource(sourceId: string): EventSource | null {
    const source = this.sources.get(sourceId)
    return source?.isActive ? source : null
  }

  getActiveSources(): EventSource[] {
    return Array.from(this.sources.values()).filter(source => source.isActive)
  }

  getAllSources(): EventSource[] {
    return Array.from(this.sources.values())
  }

  getSourcesDueForScraping(): EventSource[] {
    const now = new Date()
    return this.getActiveSources().filter(source =>
      !source.nextScrapeAt || source.nextScrapeAt <= now
    )
  }

  getSourcesByType(sourceType: EventSource['sourceType']): EventSource[] {
    return this.getActiveSources().filter(source => source.sourceType === sourceType)
  }

  async deleteSource(sourceId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('event_sources')
        .delete()
        .eq('id', sourceId)

      if (error) {
        console.error('Error deleting source from database:', error)
        return false
      }

      this.sources.delete(sourceId)
      console.log(`Deleted source: ${sourceId}`)
      return true
    } catch (error) {
      console.error('Failed to delete source:', error)
      return false
    }
  }

  private async updateSourceIfChanged(
    existingSource: EventSource,
    configSource: any
  ): Promise<void> {
    const configChanged =
      existingSource.name !== configSource.name ||
      existingSource.baseUrl !== configSource.baseUrl ||
      existingSource.sourceType !== configSource.sourceType ||
      existingSource.scrapeFrequencyHours !== configSource.scrapeFrequencyHours ||
      JSON.stringify(existingSource.scrapeConfig) !== JSON.stringify(configSource.scrapeConfig)

    if (configChanged) {
      await this.updateSource(existingSource.id, {
        name: configSource.name,
        baseUrl: configSource.baseUrl,
        sourceType: configSource.sourceType,
        scrapeConfig: configSource.scrapeConfig,
        scrapeFrequencyHours: configSource.scrapeFrequencyHours,
        isActive: configSource.isActive,
      })
      console.log(`Updated source configuration: ${existingSource.name}`)
    }
  }

  private transformDatabaseSource(dbSource: any): EventSource {
    return {
      id: dbSource.id,
      name: dbSource.name,
      baseUrl: dbSource.base_url,
      sourceType: dbSource.source_type,
      scrapeConfig: dbSource.scrape_config,
      lastScrapedAt: dbSource.last_scraped_at ? new Date(dbSource.last_scraped_at) : undefined,
      nextScrapeAt: dbSource.next_scrape_at ? new Date(dbSource.next_scrape_at) : undefined,
      scrapeFrequencyHours: dbSource.scrape_frequency_hours,
      isActive: dbSource.is_active,
      errorCount: dbSource.error_count,
      lastError: dbSource.last_error,
      createdAt: new Date(dbSource.created_at),
      updatedAt: new Date(dbSource.updated_at),
    }
  }

  private transformSourceForDatabase(source: EventSource): any {
    return {
      id: source.id,
      name: source.name,
      base_url: source.baseUrl,
      source_type: source.sourceType,
      scrape_config: source.scrapeConfig,
      last_scraped_at: source.lastScrapedAt?.toISOString(),
      next_scrape_at: source.nextScrapeAt?.toISOString(),
      scrape_frequency_hours: source.scrapeFrequencyHours,
      is_active: source.isActive,
      error_count: source.errorCount,
      last_error: source.lastError,
      created_at: source.createdAt.toISOString(),
      updated_at: source.updatedAt.toISOString(),
    }
  }

  async getMetrics(): Promise<{
    totalSources: number
    activeSources: number
    errorSources: number
    sourcesDue: number
  }> {
    return {
      totalSources: this.sources.size,
      activeSources: this.getActiveSources().length,
      errorSources: Array.from(this.sources.values()).filter(s => s.errorCount > 0).length,
      sourcesDue: this.getSourcesDueForScraping().length,
    }
  }
}