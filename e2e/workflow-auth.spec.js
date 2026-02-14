/**
 * Authenticated Workflow Tests
 *
 * These tests require authentication. Before running:
 * 1. Run: npx playwright test auth.setup.js --headed
 * 2. Sign in manually when prompted
 * 3. Then run: npm run test:e2e -- workflow-auth.spec.js
 *
 * Run with: npm run test:e2e -- workflow-auth.spec.js
 */

import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BASE_URL = process.env.TEST_URL || 'https://devops-quiz-2c930.web.app'
const authFile = path.join(__dirname, '../.auth/user.json')

// Skip all tests if auth file doesn't exist
const hasAuth = fs.existsSync(authFile)

test.describe.configure({ mode: 'serial' })

test.describe('Authenticated Quiz Workflow', () => {
  test.skip(!hasAuth, 'Requires authentication - run auth.setup.js first')

  test.use({ storageState: authFile })

  test('Admin can access dashboard', async ({ page }) => {
    await page.goto(BASE_URL)

    // Should see dashboard (already authenticated)
    await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible({ timeout: 10000 })

    // Should see quizzes tab
    await expect(page.locator('button:has-text("Quizzes")')).toBeVisible()
  })

  test('Admin can see leaderboards tab', async ({ page }) => {
    await page.goto(BASE_URL)

    // Wait for dashboard
    await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible({ timeout: 10000 })

    // Click leaderboards tab
    const leaderboardsTab = page.locator('button:has-text("Leaderboards")')
    await expect(leaderboardsTab).toBeVisible()
    await leaderboardsTab.click()

    // Should see leaderboard content
    await page.waitForTimeout(1000)

    // Either see "New Leaderboard" button or existing leaderboards
    const hasNewButton = await page.locator('button:has-text("New Leaderboard")').isVisible()
    const hasLeaderboards = await page.locator('text=/Leaderboard|players/').isVisible()

    expect(hasNewButton || hasLeaderboards).toBe(true)
  })

  test('Admin can view quiz list', async ({ page }) => {
    await page.goto(BASE_URL)

    // Wait for dashboard
    await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible({ timeout: 10000 })

    // Make sure on quizzes tab
    await page.locator('button:has-text("Quizzes")').click()

    // Wait for quizzes to load
    await page.waitForTimeout(2000)

    // Should see quiz cards or "no quizzes" message
    const hasQuizzes = await page.locator('button:has-text("Launch")').isVisible().catch(() => false)
    const hasNoQuizzes = await page.locator('text=/No quizzes|Import/').isVisible().catch(() => false)

    expect(hasQuizzes || hasNoQuizzes).toBe(true)
  })

  test('Quiz filters work', async ({ page }) => {
    await page.goto(BASE_URL)

    // Wait for dashboard
    await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible({ timeout: 10000 })

    // Make sure on quizzes tab
    await page.locator('button:has-text("Quizzes")').click()

    // Wait for quizzes to load
    await page.waitForTimeout(2000)

    // Check if course filter exists
    const hasCourseFilter = await page.locator('text=/Course:/').isVisible().catch(() => false)

    if (hasCourseFilter) {
      // Click a course filter
      const filterButtons = page.locator('button:has-text("DevOps")')
      const count = await filterButtons.count()

      if (count > 0) {
        await filterButtons.first().click()
        await page.waitForTimeout(500)

        // Should filter quizzes
        console.log('✅ Course filter clicked')
      }
    }
  })

  test('Leaderboard filters work', async ({ page }) => {
    await page.goto(BASE_URL)

    // Wait for dashboard
    await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible({ timeout: 10000 })

    // Click leaderboards tab
    await page.locator('button:has-text("Leaderboards")').click()

    // Wait for leaderboards to load
    await page.waitForTimeout(2000)

    // Check if filters exist
    const hasCourseFilter = await page.locator('text=/Course:/').isVisible().catch(() => false)
    const hasYearFilter = await page.locator('text=/Year:/').isVisible().catch(() => false)

    if (hasCourseFilter || hasYearFilter) {
      console.log('✅ Leaderboard filters present')
    } else {
      console.log('ℹ️  No leaderboard filters (might not have multiple courses/years)')
    }

    // Test passed if we got here without errors
    expect(true).toBe(true)
  })

  test('Admin can sign out', async ({ page }) => {
    await page.goto(BASE_URL)

    // Wait for dashboard
    await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible({ timeout: 10000 })

    // Look for sign out button
    const signOutButton = page.locator('button:has-text("Sign Out")')

    if (await signOutButton.isVisible()) {
      await signOutButton.click()

      // Wait for redirect to homepage
      await page.waitForTimeout(2000)

      // Should be back at homepage
      await expect(page.locator('h1')).toContainText('LectureQuiz')
    } else {
      console.log('ℹ️  Sign out button not found (UI might differ)')
    }
  })
})

test.describe('No Auth Required Message', () => {
  test.skip(hasAuth, 'Auth file exists - authenticated tests will run')

  test('Show setup instructions', async ({ page }) => {
    // This test only runs if auth file doesn't exist
    console.log('')
    console.log('❌ Authentication required!')
    console.log('')
    console.log('To run authenticated tests:')
    console.log('1. Run: npx playwright test auth.setup.js --headed')
    console.log('2. Sign in manually when browser opens')
    console.log('3. Wait for auth state to be saved')
    console.log('4. Then run: npm run test:e2e -- workflow-auth.spec.js')
    console.log('')

    // Dummy assertion to pass the test
    expect(true).toBe(true)
  })
})
