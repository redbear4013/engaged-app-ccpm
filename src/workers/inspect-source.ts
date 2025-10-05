#!/usr/bin/env node

import { chromium } from 'playwright'

async function inspectSource(url: string) {
  console.log(`\n🔍 Inspecting: ${url}\n`)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })

    // Wait for page to load
    await page.waitForTimeout(2000)

    // Try to find common event container patterns
    const possibleSelectors = [
      'article',
      '.event',
      '.event-card',
      '.event-item',
      '[class*="event"]',
      '[class*="card"]',
      '.list-item',
      '.item',
      'li[class*="event"]',
      'div[class*="event"]',
    ]

    console.log('Testing common selectors:\n')

    for (const selector of possibleSelectors) {
      const count = await page.locator(selector).count()
      if (count > 0) {
        console.log(`✅ ${selector}: ${count} elements`)

        // Get first element's structure
        const firstElement = page.locator(selector).first()
        const html = await firstElement.evaluate(el => el.outerHTML.substring(0, 500))
        console.log(`   Sample: ${html}...\n`)
      }
    }

    // Get page structure
    console.log('\n📄 Page Structure:\n')
    const bodyHTML = await page.evaluate(() => {
      const body = document.body
      const walker = document.createTreeWalker(
        body,
        NodeFilter.SHOW_ELEMENT,
        null
      )

      const elements = new Map<string, number>()
      let node
      while (node = walker.nextNode()) {
        const el = node as Element
        const classes = Array.from(el.classList).filter(c =>
          c.toLowerCase().includes('event') ||
          c.toLowerCase().includes('card') ||
          c.toLowerCase().includes('item')
        )

        if (classes.length > 0) {
          const key = `${el.tagName.toLowerCase()}.${classes.join('.')}`
          elements.set(key, (elements.get(key) || 0) + 1)
        }
      }

      return Array.from(elements.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => `${tag}: ${count}`)
        .join('\n')
    })

    console.log(bodyHTML)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await browser.close()
  }
}

const url = process.argv[2]
if (!url) {
  console.error('Usage: ts-node inspect-source.ts <url>')
  process.exit(1)
}

inspectSource(url)
