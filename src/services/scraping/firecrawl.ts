import type { RawEventData, ScrapingConfig } from '@/types/scraping'
import { FIRECRAWL_CONFIG } from '@/config/scraping'

interface FirecrawlResponse {
  success: boolean
  data?: {
    markdown?: string
    html?: string
    metadata?: {
      title?: string
      description?: string
      language?: string
      sourceURL?: string
    }
    links?: string[]
  }
  error?: string
}

interface FirecrawlScrapeOptions {
  formats?: string[]
  includeTags?: string[]
  excludeTags?: string[]
  onlyMainContent?: boolean
  waitFor?: number
  timeout?: number
}

export class FirecrawlService {
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor() {
    this.apiKey = FIRECRAWL_CONFIG.apiKey || ''
    this.baseUrl = FIRECRAWL_CONFIG.baseUrl

    if (!this.apiKey) {
      console.warn('Firecrawl API key not configured. Firecrawl service will be disabled.')
    }
  }

  async scrapeUrl(
    url: string,
    options: FirecrawlScrapeOptions = {}
  ): Promise<FirecrawlResponse | null> {
    if (!this.apiKey) {
      console.warn('Firecrawl API key not available')
      return null
    }

    try {
      const requestOptions = {
        ...FIRECRAWL_CONFIG.defaultOptions,
        ...options
      }

      const response = await fetch(`${this.baseUrl}/v0/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          ...requestOptions
        })
      })

      if (!response.ok) {
        throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`)
      }

      const data: FirecrawlResponse = await response.json()
      return data
    } catch (error) {
      console.error('Error calling Firecrawl API:', error)
      return null
    }
  }

  async extractStructuredData(
    url: string,
    config: ScrapingConfig,
    sourceId: string
  ): Promise<RawEventData[]> {
    const response = await this.scrapeUrl(url, {
      formats: ['markdown', 'html'],
      onlyMainContent: true,
      waitFor: config.waitFor?.timeout || 3000
    })

    if (!response?.success || !response.data) {
      return []
    }

    try {
      return await this.parseStructuredData(response.data, config, sourceId, url)
    } catch (error) {
      console.error('Error parsing Firecrawl response:', error)
      return []
    }
  }

  private async parseStructuredData(
    data: NonNullable<FirecrawlResponse['data']>,
    config: ScrapingConfig,
    sourceId: string,
    sourceUrl: string
  ): Promise<RawEventData[]> {
    const events: RawEventData[] = []

    // Try to parse from HTML first if available
    if (data.html) {
      const htmlEvents = await this.parseHTMLForEvents(data.html, config, sourceId, sourceUrl)
      events.push(...htmlEvents)
    }

    // If no events found in HTML, try markdown
    if (events.length === 0 && data.markdown) {
      const markdownEvents = this.parseMarkdownForEvents(data.markdown, sourceId, sourceUrl)
      events.push(...markdownEvents)
    }

    return events
  }

  private async parseHTMLForEvents(
    html: string,
    config: ScrapingConfig,
    sourceId: string,
    sourceUrl: string
  ): Promise<RawEventData[]> {
    // Use a basic HTML parser approach
    // This is a simplified implementation - in production you might want to use Cheerio
    const events: RawEventData[] = []

    try {
      // Create a temporary DOM parser for server-side parsing
      const { JSDOM } = await import('jsdom')
      const dom = new JSDOM(html)
      const document = dom.window.document

      // Find event elements based on selectors
      const eventElements = document.querySelectorAll(config.selectors.title)

      eventElements.forEach(element => {
        const container = element.closest('[data-event]') ||
                         element.closest('.event') ||
                         element.closest('.event-card') ||
                         element.parentElement

        if (!container) return

        const title = this.extractTextFromElement(container, config.selectors.title)
        if (!title) return

        const description = config.selectors.description ?
          this.extractTextFromElement(container, config.selectors.description) : undefined

        const startTime = config.selectors.startTime ?
          this.extractTextFromElement(container, config.selectors.startTime) : undefined

        const endTime = config.selectors.endTime ?
          this.extractTextFromElement(container, config.selectors.endTime) : undefined

        const location = config.selectors.location ?
          this.extractTextFromElement(container, config.selectors.location) : undefined

        const price = config.selectors.price ?
          this.extractTextFromElement(container, config.selectors.price) : undefined

        const imageUrl = config.selectors.image ?
          this.extractAttributeFromElement(container, config.selectors.image, 'src') : undefined

        const linkUrl = config.selectors.link ?
          this.extractAttributeFromElement(container, config.selectors.link, 'href') : sourceUrl

        events.push({
          title: title.trim(),
          description: description?.trim(),
          startTime: this.normalizeDateTime(startTime?.trim()),
          endTime: this.normalizeDateTime(endTime?.trim()),
          location: location?.trim(),
          price: price?.trim(),
          imageUrl: imageUrl ? this.resolveUrl(imageUrl, sourceUrl) : undefined,
          sourceUrl: linkUrl ? this.resolveUrl(linkUrl, sourceUrl) : sourceUrl,
          extractedAt: new Date(),
          sourceId,
          scrapeHash: '', // Will be generated later
        })
      })
    } catch (error) {
      console.error('Error parsing HTML with Firecrawl:', error)
    }

    return events
  }

  private parseMarkdownForEvents(
    markdown: string,
    sourceId: string,
    sourceUrl: string
  ): RawEventData[] {
    const events: RawEventData[] = []

    try {
      // Basic markdown parsing for event-like structures
      const lines = markdown.split('\n')
      let currentEvent: Partial<RawEventData> | null = null

      for (const line of lines) {
        const trimmedLine = line.trim()

        // Look for event titles (headers)
        if (trimmedLine.match(/^#{1,3}\s+(.+)/)) {
          // Save previous event if it exists
          if (currentEvent?.title) {
            events.push(this.finalizeEvent(currentEvent, sourceId, sourceUrl))
          }

          // Start new event
          const title = trimmedLine.replace(/^#+\s+/, '')
          currentEvent = { title }
        }

        // Look for date patterns
        if (currentEvent && this.isDateLine(trimmedLine)) {
          currentEvent.startTime = this.extractDateFromLine(trimmedLine)
        }

        // Look for location patterns
        if (currentEvent && this.isLocationLine(trimmedLine)) {
          currentEvent.location = this.extractLocationFromLine(trimmedLine)
        }

        // Look for price patterns
        if (currentEvent && this.isPriceLine(trimmedLine)) {
          currentEvent.price = this.extractPriceFromLine(trimmedLine)
        }

        // Accumulate description
        if (currentEvent && trimmedLine &&
            !trimmedLine.startsWith('#') &&
            !this.isDateLine(trimmedLine) &&
            !this.isLocationLine(trimmedLine) &&
            !this.isPriceLine(trimmedLine)) {
          currentEvent.description = currentEvent.description ?
            `${currentEvent.description} ${trimmedLine}` : trimmedLine
        }
      }

      // Save the last event
      if (currentEvent?.title) {
        events.push(this.finalizeEvent(currentEvent, sourceId, sourceUrl))
      }
    } catch (error) {
      console.error('Error parsing markdown for events:', error)
    }

    return events
  }

  private extractTextFromElement(container: Element, selector: string): string | undefined {
    const element = container.querySelector(selector)
    return element?.textContent?.trim() || undefined
  }

  private extractAttributeFromElement(
    container: Element,
    selector: string,
    attribute: string
  ): string | undefined {
    const element = container.querySelector(selector)
    return element?.getAttribute(attribute) || undefined
  }

  private resolveUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).href
    } catch {
      return url
    }
  }

  private normalizeDateTime(dateStr?: string): string | undefined {
    if (!dateStr) return undefined

    try {
      // Try to parse the date string and return ISO format
      const date = new Date(dateStr)
      return isNaN(date.getTime()) ? dateStr : date.toISOString()
    } catch {
      return dateStr
    }
  }

  private isDateLine(line: string): boolean {
    const datePatterns = [
      /\d{1,2}\/\d{1,2}\/\d{4}/,
      /\d{1,2}-\d{1,2}-\d{4}/,
      /\d{4}-\d{1,2}-\d{1,2}/,
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
    ]
    return datePatterns.some(pattern => pattern.test(line))
  }

  private isLocationLine(line: string): boolean {
    const locationKeywords = ['venue', 'location', 'address', 'at', 'where']
    return locationKeywords.some(keyword =>
      line.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  private isPriceLine(line: string): boolean {
    const pricePatterns = [
      /\$\d+/,
      /hkd?\s*\d+/i,
      /mop?\s*\d+/i,
      /price/i,
      /free/i,
      /ticket/i
    ]
    return pricePatterns.some(pattern => pattern.test(line))
  }

  private extractDateFromLine(line: string): string | undefined {
    // Simple date extraction - could be enhanced
    const dateMatch = line.match(/\d{4}-\d{1,2}-\d{1,2}/) ||
                      line.match(/\d{1,2}\/\d{1,2}\/\d{4}/) ||
                      line.match(/\d{1,2}-\d{1,2}-\d{4}/)
    return dateMatch ? dateMatch[0] : undefined
  }

  private extractLocationFromLine(line: string): string | undefined {
    // Remove common prefixes and return the rest
    return line.replace(/^(venue|location|address|at|where):\s*/i, '').trim()
  }

  private extractPriceFromLine(line: string): string | undefined {
    const priceMatch = line.match(/(\$\d+|hkd?\s*\d+|mop?\s*\d+|free)/i)
    return priceMatch ? priceMatch[0] : undefined
  }

  private finalizeEvent(
    event: Partial<RawEventData>,
    sourceId: string,
    sourceUrl: string
  ): RawEventData {
    return {
      title: event.title || '',
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      price: event.price,
      imageUrl: event.imageUrl,
      sourceUrl,
      extractedAt: new Date(),
      sourceId,
      scrapeHash: '', // Will be generated later
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }
}