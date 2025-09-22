import { chromium, type Browser, type Page, type BrowserContext } from 'playwright'
import type { ScrapingConfig, RawEventData } from '@/types/scraping'
import { SCRAPING_CONFIG } from '@/config/scraping'

export class EventScraper {
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private readonly config = SCRAPING_CONFIG.scraping

  async initialize(): Promise<void> {
    if (this.browser) return

    try {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-dev-shm-usage',
        ],
      })

      this.context = await this.browser.newContext({
        userAgent: this.getRandomUserAgent(),
        viewport: { width: 1280, height: 720 },
        javaScriptEnabled: this.config.enableJavaScript,
        ignoreHTTPSErrors: true,
      })

      console.log('EventScraper initialized successfully')
    } catch (error) {
      console.error('Failed to initialize EventScraper:', error)
      throw error
    }
  }

  async close(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close()
        this.context = null
      }
      if (this.browser) {
        await this.browser.close()
        this.browser = null
      }
      console.log('EventScraper closed successfully')
    } catch (error) {
      console.error('Error closing EventScraper:', error)
    }
  }

  async scrapeEvents(
    url: string,
    config: ScrapingConfig,
    sourceId: string
  ): Promise<RawEventData[]> {
    if (!this.context) {
      throw new Error('Scraper not initialized. Call initialize() first.')
    }

    const page = await this.context.newPage()
    const events: RawEventData[] = []

    try {
      // Configure page settings
      await this.configurePage(page, config)

      // Navigate to the URL
      console.log(`Scraping events from: ${url}`)
      await page.goto(url, {
        waitUntil: config.waitFor?.networkIdle ? 'networkidle' : 'domcontentloaded',
        timeout: config.waitFor?.timeout || this.config.defaultTimeout
      })

      // Wait for specific elements if configured
      if (config.waitFor?.selector) {
        await page.waitForSelector(config.waitFor.selector, {
          timeout: config.waitFor.timeout || this.config.defaultTimeout
        })
      }

      // Add delay if configured
      if (config.delay) {
        await page.waitForTimeout(config.delay)
      }

      // Handle pagination if enabled
      let currentPage = 1
      const maxPages = config.pagination?.maxPages || 1

      do {
        console.log(`Scraping page ${currentPage} of ${maxPages}`)

        // Extract events from current page
        const pageEvents = await this.extractEventsFromPage(page, config, sourceId)
        events.push(...pageEvents)

        // Check if we should continue to next page
        if (config.pagination?.enabled && currentPage < maxPages) {
          const hasNextPage = await this.navigateToNextPage(page, config)
          if (!hasNextPage) break
          currentPage++
        } else {
          break
        }
      } while (currentPage <= maxPages)

      console.log(`Scraped ${events.length} events from ${url}`)
      return events

    } catch (error) {
      console.error(`Error scraping events from ${url}:`, error)
      throw error
    } finally {
      await page.close()
    }
  }

  private async configurePage(page: Page, config: ScrapingConfig): Promise<void> {
    // Set viewport if configured
    if (config.viewport) {
      await page.setViewportSize(config.viewport)
    }

    // Set user agent if configured
    if (config.userAgent) {
      await page.setExtraHTTPHeaders({
        'User-Agent': config.userAgent
      })
    }

    // Set cookies if configured
    if (config.cookies && config.cookies.length > 0) {
      await page.context().addCookies(config.cookies)
    }

    // Block images and other resources for performance if configured
    if (!this.config.enableImages) {
      await page.route('**/*.{png,jpg,jpeg,gif,svg,webp}', route => route.abort())
    }
  }

  private async extractEventsFromPage(
    page: Page,
    config: ScrapingConfig,
    sourceId: string
  ): Promise<RawEventData[]> {
    try {
      const events = await page.evaluate((cfg, srcId) => {
        const eventElements = document.querySelectorAll(cfg.selectors.title)
        const extractedEvents: RawEventData[] = []

        eventElements.forEach((element, index) => {
          try {
            const container = element.closest('[data-event-container]') ||
                             element.closest('.event') ||
                             element.closest('.event-card') ||
                             element.parentElement

            if (!container) return

            // Extract event data using selectors
            const title = this.extractText(container, cfg.selectors.title)
            if (!title) return // Skip if no title

            const description = cfg.selectors.description ?
              this.extractText(container, cfg.selectors.description) : undefined

            const startTime = cfg.selectors.startTime ?
              this.extractText(container, cfg.selectors.startTime) : undefined

            const endTime = cfg.selectors.endTime ?
              this.extractText(container, cfg.selectors.endTime) : undefined

            const location = cfg.selectors.location ?
              this.extractText(container, cfg.selectors.location) : undefined

            const price = cfg.selectors.price ?
              this.extractText(container, cfg.selectors.price) : undefined

            const imageUrl = cfg.selectors.image ?
              this.extractAttribute(container, cfg.selectors.image, 'src') : undefined

            const sourceUrl = cfg.selectors.link ?
              this.extractAttribute(container, cfg.selectors.link, 'href') : window.location.href

            extractedEvents.push({
              title: title.trim(),
              description: description?.trim(),
              startTime: startTime?.trim(),
              endTime: endTime?.trim(),
              location: location?.trim(),
              price: price?.trim(),
              imageUrl: imageUrl ? new URL(imageUrl, window.location.href).href : undefined,
              sourceUrl: sourceUrl ? new URL(sourceUrl, window.location.href).href : window.location.href,
              extractedAt: new Date(),
              sourceId: srcId,
              scrapeHash: '', // Will be generated later
            })
          } catch (error) {
            console.warn(`Error extracting event ${index}:`, error)
          }
        })

        return extractedEvents

        // Helper functions for extraction
        function extractText(container: Element, selector: string): string | undefined {
          const element = container.querySelector(selector)
          return element?.textContent?.trim() || undefined
        }

        function extractAttribute(container: Element, selector: string, attribute: string): string | undefined {
          const element = container.querySelector(selector)
          return element?.getAttribute(attribute) || undefined
        }
      }, config, sourceId)

      return events.filter(event => event.title) // Filter out events without titles
    } catch (error) {
      console.error('Error extracting events from page:', error)
      return []
    }
  }

  private async navigateToNextPage(page: Page, config: ScrapingConfig): Promise<boolean> {
    if (!config.pagination?.nextButtonSelector) return false

    try {
      const nextButton = await page.$(config.pagination.nextButtonSelector)
      if (!nextButton) return false

      // Check if button is disabled or hidden
      const isDisabled = await nextButton.getAttribute('disabled') !== null
      const isHidden = await nextButton.isHidden()

      if (isDisabled || isHidden) return false

      // Click the next button
      await nextButton.click()

      // Wait for page to load
      await page.waitForLoadState('networkidle', { timeout: 10000 })

      // Add delay after navigation
      if (config.delay) {
        await page.waitForTimeout(config.delay)
      }

      return true
    } catch (error) {
      console.warn('Error navigating to next page:', error)
      return false
    }
  }

  private getRandomUserAgent(): string {
    const userAgents = this.config.userAgents
    return userAgents[Math.floor(Math.random() * userAgents.length)]
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.browser || !this.context) return false

      // Try to create a new page and navigate to a simple URL
      const page = await this.context.newPage()
      await page.goto('data:text/html,<html><body>Health Check</body></html>')
      await page.close()

      return true
    } catch {
      return false
    }
  }
}