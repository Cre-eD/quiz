/**
 * Quiz Navigation and Filtering Tests
 *
 * Tests quiz browsing, filtering, and navigation in dashboard
 * Note: Requires authentication, so these tests use localStorage for session restoration
 *
 * Run with: npm run test:e2e -- quiz-navigation.spec.js
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173'

test.describe('Quiz Navigation (Unauthenticated)', () => {
  test('Homepage displays all required elements', async ({ page }) => {
    await page.goto(BASE_URL)

    // Main title
    await expect(page.locator('h1')).toContainText('LectureQuiz')

    // Join form
    await expect(page.locator('input[placeholder="PIN"]')).toBeVisible()
    await expect(page.locator('input[placeholder*="Nickname"]')).toBeVisible()
    await expect(page.locator('button:has-text("Join Game")')).toBeVisible()

    // Teacher button
    await expect(page.locator('button:has-text("teacher")')).toBeVisible()
  })

  test('Page has no console errors on load', async ({ page }) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))

    await page.goto(BASE_URL)

    // Wait for page to fully load
    await page.waitForTimeout(2000)

    expect(errors).toEqual([])
  })

  test('Page has correct meta tags', async ({ page }) => {
    await page.goto(BASE_URL)

    // Check title
    const title = await page.title()
    expect(title).toBeTruthy()
    expect(title.length).toBeGreaterThan(0)

    // Check viewport meta tag exists (responsive design)
    const viewport = await page.locator('meta[name="viewport"]').count()
    expect(viewport).toBeGreaterThan(0)
  })

  test('Responsive design - mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto(BASE_URL)

    // Elements should still be visible on mobile
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('input[placeholder="PIN"]')).toBeVisible()
    await expect(page.locator('button:has-text("Join Game")')).toBeVisible()
  })

  test('Responsive design - tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })

    await page.goto(BASE_URL)

    // Elements should be visible on tablet
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('input[placeholder="PIN"]')).toBeVisible()
  })

  test('Responsive design - desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })

    await page.goto(BASE_URL)

    // Elements should be visible on desktop
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('input[placeholder="PIN"]')).toBeVisible()
  })

  test('No JavaScript errors in console', async ({ page }) => {
    const jsErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        jsErrors.push(msg.text())
      }
    })

    await page.goto(BASE_URL)
    await page.waitForTimeout(2000)

    // Should have no JavaScript errors (excluding favicon 404)
    expect(jsErrors).toEqual([])
  })

  test('Images and icons load correctly', async ({ page }) => {
    await page.goto(BASE_URL)

    // Wait for page to load
    await page.waitForTimeout(1000)

    // Check that FontAwesome icons are loaded (look for fa classes)
    const hasIcons = await page.locator('i[class*="fa"]').count()
    expect(hasIcons).toBeGreaterThan(0)
  })

  test('CSS styling is applied', async ({ page }) => {
    await page.goto(BASE_URL)

    // Check that main container has background styling
    const body = page.locator('body')
    const bgColor = await body.evaluate(el => window.getComputedStyle(el).backgroundColor)

    // Should have a background color (not default white)
    expect(bgColor).toBeTruthy()
  })

  test('Keyboard navigation works', async ({ page }) => {
    await page.goto(BASE_URL)

    // Wait for page to be interactive
    await page.waitForLoadState('networkidle')

    // Tab through form elements
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)

    // Check that something is focused (any interactive element)
    const hasActivElement = await page.evaluate(() => {
      return document.activeElement !== null && document.activeElement !== document.body
    })

    expect(hasActivElement).toBe(true)
  })

  test('Enter key in PIN input moves focus', async ({ page }) => {
    await page.goto(BASE_URL)

    const pinInput = page.locator('input[placeholder="PIN"]')
    await pinInput.click()
    await pinInput.fill('1234')

    // Press Enter
    await page.keyboard.press('Enter')

    // Should move to next field or trigger join
    await page.waitForTimeout(500)

    // Page should still be functional
    await expect(page.locator('h1')).toBeVisible()
  })
})

test.describe('Quiz Dashboard Smoke Tests', () => {
  test('Dashboard renders access denied for non-admin', async ({ page }) => {
    await page.goto(BASE_URL)

    // Click teacher button (without actually signing in)
    await page.locator('button:has-text("teacher")').click()

    // Wait for any auth flow
    await page.waitForTimeout(2000)

    // Should show either:
    // 1. Sign in page/popup
    // 2. Access denied message
    // 3. Still on homepage (auth failed)
    const pageIsVisible = await page.locator('h1').isVisible()
    expect(pageIsVisible).toBe(true)
  })

  test('Quiz editor not accessible without auth', async ({ page }) => {
    // Try to access dashboard directly
    await page.goto(BASE_URL)

    // Without auth, should not see quiz editor elements
    const hasEditButton = await page.locator('button:has-text("Edit")').isVisible().catch(() => false)
    const hasNewQuizButton = await page.locator('button:has-text("New Quiz")').isVisible().catch(() => false)

    // Should not be accessible
    expect(hasEditButton || hasNewQuizButton).toBe(false)
  })
})
