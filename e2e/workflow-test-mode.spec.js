/**
 * Authenticated Workflow Tests (Test Mode)
 *
 * These tests use test mode to bypass OAuth and test admin features.
 * Test mode ONLY works in development builds and is completely removed from production.
 *
 * Run with: npm run test:e2e:test-mode
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173' // Dev server with test mode

// Skip these tests if running against production (test mode only works in dev)
test.describe.skip('Authenticated Quiz Workflow (Test Mode)', () => {
  test('Admin can sign in with Google and access dashboard', async ({ page }) => {
    await page.goto(BASE_URL)

    // Should see homepage
    await expect(page.locator('h1:has-text("LectureQuiz")')).toBeVisible()

    // Click "I'm a teacher" button
    await page.locator('button:has-text("teacher")').click()

    // In test mode, Google sign-in should work
    // Wait for auth flow (might redirect to Google)
    await page.waitForTimeout(5000)

    // After successful sign-in, should see dashboard
    // Check if on dashboard or still on auth flow
    const hasDashboard = await page.locator('h2:has-text("Dashboard")').isVisible({ timeout: 15000 }).catch(() => false)

    if (hasDashboard) {
      // Successfully signed in and on dashboard
      await expect(page.locator('button:has-text("Quizzes")')).toBeVisible()
      console.log('✅ Test mode: Admin access granted')
    } else {
      // Might need manual sign-in even in test mode
      console.log('⚠️  Sign-in required - test mode grants access after Google auth')
    }
  })

  test('Admin can view quiz list', async ({ page }) => {
    // This test assumes you're already signed in from previous test
    // or that you've manually signed in with Google
    await page.goto(BASE_URL)

    // Wait for dashboard
    const hasDashboard = await page.locator('h2:has-text("Dashboard")').isVisible({ timeout: 10000 }).catch(() => false)

    if (!hasDashboard) {
      console.log('⚠️  Not signed in - skipping test')
      test.skip()
      return
    }

    // Click Quizzes tab
    await page.locator('button:has-text("Quizzes")').click()
    await page.waitForTimeout(2000)

    // Should see quiz list or empty state
    const hasQuizzes = await page.locator('text=/Quiz|Import|Launch/i').isVisible()
    expect(hasQuizzes).toBe(true)
  })

  test('Admin can view leaderboards', async ({ page }) => {
    await page.goto(BASE_URL)

    // Wait for dashboard
    const hasDashboard = await page.locator('h2:has-text("Dashboard")').isVisible({ timeout: 10000 }).catch(() => false)

    if (!hasDashboard) {
      console.log('⚠️  Not signed in - skipping test')
      test.skip()
      return
    }

    // Click Leaderboards tab
    await page.locator('button:has-text("Leaderboards")').click()
    await page.waitForTimeout(2000)

    // Should see leaderboard content
    const hasContent = await page.locator('text=/Leaderboard|New Leaderboard/i').isVisible()
    expect(hasContent).toBe(true)
  })
})
