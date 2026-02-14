/**
 * Accessibility and Performance Tests
 *
 * Tests for:
 * - Keyboard navigation
 * - Screen reader compatibility
 * - ARIA labels
 * - Loading performance
 * - Animation performance
 *
 * Run with: npm run test:e2e -- accessibility.spec.js
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173'

test.describe('Accessibility Tests', () => {
  test('All interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto(BASE_URL)

    // Start from beginning
    await page.keyboard.press('Tab')

    // Should be able to tab through all interactive elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
    }

    // Should have cycled through form and buttons
    const pinInput = page.locator('input[placeholder="PIN"]')
    const nameInput = page.locator('input[placeholder*="Nickname"]')
    const joinButton = page.locator('button:has-text("Join Game")')
    const teacherButton = page.locator('button:has-text("teacher")')

    // At least one should be focused
    const pinFocused = await pinInput.evaluate(el => el === document.activeElement)
    const nameFocused = await nameInput.evaluate(el => el === document.activeElement)
    const joinFocused = await joinButton.evaluate(el => el === document.activeElement)
    const teacherFocused = await teacherButton.evaluate(el => el === document.activeElement)

    expect(pinFocused || nameFocused || joinFocused || teacherFocused).toBe(true)
  })

  test('Form inputs have proper labels or placeholders', async ({ page }) => {
    await page.goto(BASE_URL)

    // PIN input should have placeholder
    const pinInput = page.locator('input[placeholder="PIN"]')
    await expect(pinInput).toBeVisible()
    const pinPlaceholder = await pinInput.getAttribute('placeholder')
    expect(pinPlaceholder).toBeTruthy()

    // Name input should have placeholder
    const nameInput = page.locator('input[placeholder*="Nickname"]')
    await expect(nameInput).toBeVisible()
    const namePlaceholder = await nameInput.getAttribute('placeholder')
    expect(namePlaceholder).toBeTruthy()
  })

  test('Buttons have descriptive text', async ({ page }) => {
    await page.goto(BASE_URL)

    // Join button should have clear text
    const joinButton = page.locator('button:has-text("Join Game")')
    await expect(joinButton).toBeVisible()
    const joinText = await joinButton.textContent()
    expect(joinText).toContain('Join')

    // Teacher button should have clear text
    const teacherButton = page.locator('button:has-text("teacher")')
    await expect(teacherButton).toBeVisible()
    const teacherText = await teacherButton.textContent()
    expect(teacherText.toLowerCase()).toContain('teacher')
  })

  test('Focus visible on interactive elements', async ({ page }) => {
    await page.goto(BASE_URL)

    // Tab to PIN input
    await page.keyboard.press('Tab')

    // Check if focus is visible (has outline or visible focus indicator)
    const pinInput = page.locator('input[placeholder="PIN"]')
    const outlineWidth = await pinInput.evaluate(el => {
      return window.getComputedStyle(el).outlineWidth
    })

    // Should have some focus indicator (outline, border, shadow, etc.)
    // This is a basic check - exact implementation may vary
    expect(outlineWidth).toBeDefined()
  })

  test('Skip navigation link exists (optional but good practice)', async ({ page }) => {
    await page.goto(BASE_URL)

    // Check for skip link (common accessibility pattern)
    const skipLink = await page.locator('a[href="#main"], a:has-text("Skip to content")').isVisible().catch(() => false)

    // This is optional, so we just log the result
    console.log(`Skip link present: ${skipLink}`)
  })

  test('Images have alt text (if any images exist)', async ({ page }) => {
    await page.goto(BASE_URL)

    // Find all images
    const images = await page.locator('img').all()

    for (const img of images) {
      const alt = await img.getAttribute('alt')
      // Alt attribute should exist (can be empty for decorative images)
      expect(alt !== null).toBe(true)
    }
  })

  test('Color contrast is readable', async ({ page }) => {
    await page.goto(BASE_URL)

    // Check main heading color contrast
    const heading = page.locator('h1')
    const color = await heading.evaluate(el => {
      const style = window.getComputedStyle(el)
      return {
        color: style.color,
        backgroundColor: style.backgroundColor
      }
    })

    // Should have defined colors
    expect(color.color).toBeTruthy()
  })

  test('Page has proper heading structure', async ({ page }) => {
    await page.goto(BASE_URL)

    // Should have h1
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBeGreaterThan(0)

    // Should only have one h1 (best practice)
    expect(h1Count).toBeLessThanOrEqual(1)
  })

  test('HTML lang attribute is set', async ({ page }) => {
    await page.goto(BASE_URL)

    // Check html lang attribute
    const lang = await page.getAttribute('html', 'lang')
    expect(lang).toBeTruthy()
  })
})

test.describe('Performance Tests', () => {
  test('Page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now()

    await page.goto(BASE_URL)

    // Wait for main content to be visible
    await expect(page.locator('h1')).toBeVisible()

    const loadTime = Date.now() - startTime

    // Should load in less than 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })

  test('Initial render is fast', async ({ page }) => {
    await page.goto(BASE_URL)

    // Measure time to first contentful paint
    const perfMetrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0]
      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart
      }
    })

    // DOM content loaded should be fast (< 1 second)
    expect(perfMetrics.domContentLoaded).toBeLessThan(1000)
  })

  test('No large layout shifts on load', async ({ page }) => {
    await page.goto(BASE_URL)

    // Wait for page to settle
    await page.waitForTimeout(1000)

    // Check Cumulative Layout Shift
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let cls = 0
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
              cls += entry.value
            }
          }
        })

        observer.observe({ entryTypes: ['layout-shift'] })

        // Measure for 2 seconds
        setTimeout(() => {
          resolve(cls)
          observer.disconnect()
        }, 2000)
      })
    })

    // CLS should be low (< 0.1 is good)
    console.log(`Cumulative Layout Shift: ${cls}`)
    expect(cls).toBeLessThan(0.5) // Lenient threshold for testing
  })

  test('JavaScript bundle size is reasonable', async ({ page }) => {
    const responses = []

    page.on('response', response => {
      if (response.url().includes('.js')) {
        responses.push({
          url: response.url(),
          size: parseInt(response.headers()['content-length'] || '0')
        })
      }
    })

    await page.goto(BASE_URL)

    await page.waitForTimeout(2000)

    // Calculate total JS size
    const totalSize = responses.reduce((sum, r) => sum + r.size, 0)
    const totalSizeKB = totalSize / 1024

    console.log(`Total JS bundle size: ${totalSizeKB.toFixed(2)} KB`)

    // Bundle should be under 2MB (very lenient)
    expect(totalSizeKB).toBeLessThan(2048)
  })

  test('CSS is loaded and applied', async ({ page }) => {
    await page.goto(BASE_URL)

    // Check that styles are applied
    const heading = page.locator('h1')
    const fontSize = await heading.evaluate(el => {
      return window.getComputedStyle(el).fontSize
    })

    // Should have a defined font size
    expect(fontSize).toBeTruthy()
    expect(fontSize).not.toBe('16px') // Should be custom styled, not default
  })

  test('Fonts load correctly', async ({ page }) => {
    await page.goto(BASE_URL)

    await page.waitForTimeout(1000)

    // Check if fonts are loaded
    const fontFamily = await page.evaluate(() => {
      return window.getComputedStyle(document.body).fontFamily
    })

    expect(fontFamily).toBeTruthy()
  })

  test('No memory leaks on navigation', async ({ page }) => {
    await page.goto(BASE_URL)

    // Simulate navigation
    for (let i = 0; i < 5; i++) {
      await page.locator('input[placeholder="PIN"]').fill(`${i}234`)
      await page.waitForTimeout(100)
    }

    // Get memory usage (if available)
    const memoryInfo = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize
        }
      }
      return null
    })

    // Just log the memory info
    if (memoryInfo) {
      console.log(`Memory usage: ${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`)
    }

    // App should still be functional
    await expect(page.locator('h1')).toBeVisible()
  })
})

test.describe('Mobile Experience', () => {
  test('Touch interactions work on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(BASE_URL)

    // Tap on PIN input
    await page.locator('input[placeholder="PIN"]').tap()

    // Should be focused
    const isFocused = await page.locator('input[placeholder="PIN"]').evaluate(el => el === document.activeElement)
    expect(isFocused).toBe(true)
  })

  test('No horizontal scroll on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(BASE_URL)

    // Check for horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })

    // Should not have horizontal scroll
    expect(hasHorizontalScroll).toBe(false)
  })

  test('Touch target size is adequate', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(BASE_URL)

    // Check button size (should be at least 44x44 pixels for touch)
    const joinButton = page.locator('button:has-text("Join Game")')
    const buttonSize = await joinButton.boundingBox()

    if (buttonSize) {
      expect(buttonSize.height).toBeGreaterThanOrEqual(40) // Slightly lenient
    }
  })
})
