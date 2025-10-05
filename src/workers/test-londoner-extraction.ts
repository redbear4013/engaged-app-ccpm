#!/usr/bin/env node
/**
 * Test what data is actually being extracted by the Playwright scraper
 */

import { chromium } from 'playwright'

async function testExtraction() {
  console.log('🔍 Testing Londoner Event Extraction\n')

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  await page.goto('https://www.londonermacao.com/macau-events-shows', {
    waitUntil: 'domcontentloaded'
  })

  await page.waitForSelector('h3.two_columns-describe-text', { timeout: 60000 })

  const extractedData = await page.evaluate(() => {
    const eventElements = document.querySelectorAll('h3.two_columns-describe-text')
    const results: any[] = []

    eventElements.forEach((element, index) => {
      const container = element.closest('[data-event-container]') ||
                       element.closest('.event') ||
                       element.closest('.event-card') ||
                       element.parentElement

      if (!container) return

      // Try different selector variations
      const title = container.querySelector('h3.two_columns-describe-text')?.textContent?.trim()

      // Try to find paragraphs
      const allP = Array.from(container.querySelectorAll('p'))
      const descriptionDiv = container.querySelector('.two_columns-describe-description')
      const paragraphsInDesc = descriptionDiv ? Array.from(descriptionDiv.querySelectorAll('p')) : []

      results.push({
        index,
        title,
        containerTagName: container.tagName,
        containerClass: (container as HTMLElement).className,
        allParagraphsCount: allP.length,
        paragraphsInDescCount: paragraphsInDesc.length,
        paragraphTexts: allP.map(p => p.textContent?.trim()),
        descParagraphTexts: paragraphsInDesc.map(p => p.textContent?.trim()),
        // Test specific selectors
        selector1: container.querySelector('.two_columns-describe-description p:nth-of-type(1)')?.textContent?.trim(),
        selector2: container.querySelector('.two_columns-describe-description p:nth-of-type(2)')?.textContent?.trim(),
        selector3: container.querySelector('.two_columns-describe-description p:nth-of-type(3)')?.textContent?.trim()
      })
    })

    return results
  })

  console.log(JSON.stringify(extractedData, null, 2))

  await browser.close()
}

testExtraction()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
