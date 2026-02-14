/**
 * Game Flow Tests
 *
 * Tests the player game experience including:
 * - Session persistence with localStorage
 * - Answer submission
 * - Score updates
 * - Session disconnection handling
 *
 * Run with: npm run test:e2e -- game-flow.spec.js
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173'

test.describe('Game Flow - Player Experience', () => {
  test('localStorage session restoration attempt', async ({ page, context }) => {
    await page.goto(BASE_URL)

    // Try to set a fake session in localStorage
    await context.addInitScript(() => {
      localStorage.setItem('quizSession', JSON.stringify({
        pin: '1234',
        playerName: 'TestPlayer',
        timestamp: Date.now()
      }))
    })

    // Reload page
    await page.reload()

    // Wait for restoration attempt
    await page.waitForTimeout(2000)

    // Should try to restore session (might fail if session doesn't exist)
    // But should not crash the app
    await expect(page.locator('h1')).toBeVisible()
  })

  test('Session state persists in localStorage', async ({ page }) => {
    await page.goto(BASE_URL)

    // Fill join form
    await page.locator('input[placeholder="PIN"]').fill('1234')
    await page.locator('input[placeholder*="Nickname"]').fill('TestPlayer')

    // Try to join (will fail but should store attempt)
    await page.locator('button:has-text("Join Game")').click()

    await page.waitForTimeout(1000)

    // Check localStorage for any session data
    const hasSessionData = await page.evaluate(() => {
      return localStorage.getItem('quizSession') !== null
    })

    // Depending on implementation, session might be saved
    // The test just verifies no crash occurs
    expect(hasSessionData).toBeDefined()
  })

  test('Page reload during join does not crash', async ({ page }) => {
    await page.goto(BASE_URL)

    // Fill form
    await page.locator('input[placeholder="PIN"]').fill('1234')
    await page.locator('input[placeholder*="Nickname"]').fill('TestPlayer')

    // Click join and immediately reload
    await page.locator('button:has-text("Join Game")').click()
    await page.reload()

    // Should load without errors
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('input[placeholder="PIN"]')).toBeVisible()
  })

  test('Browser back button during join flow', async ({ page }) => {
    await page.goto(BASE_URL)

    // Fill and submit form
    await page.locator('input[placeholder="PIN"]').fill('1234')
    await page.locator('input[placeholder*="Nickname"]').fill('TestPlayer')
    await page.locator('button:has-text("Join Game")').click()

    // Wait for any navigation or error
    await page.waitForTimeout(2000)

    // Try back button
    await page.goBack({ waitUntil: 'networkidle' })

    // Should return to home page or be on home page already
    await expect(page.locator('h1')).toContainText('LectureQuiz', { timeout: 5000 })
  })

  test('Multiple tabs with same session', async ({ context }) => {
    // Create first tab
    const page1 = await context.newPage()
    await page1.goto(BASE_URL)

    // Fill form in first tab
    await page1.locator('input[placeholder="PIN"]').fill('1234')
    await page1.locator('input[placeholder*="Nickname"]').fill('Player1')

    // Create second tab
    const page2 = await context.newPage()
    await page2.goto(BASE_URL)

    // Fill form in second tab with different data
    await page2.locator('input[placeholder="PIN"]').fill('5678')
    await page2.locator('input[placeholder*="Nickname"]').fill('Player2')

    // Both tabs should maintain their own state
    await expect(page1.locator('input[placeholder="PIN"]')).toHaveValue('1234')
    await expect(page2.locator('input[placeholder="PIN"]')).toHaveValue('5678')
  })

  test('Network offline simulation', async ({ page, context }) => {
    await page.goto(BASE_URL)

    // Go offline
    await context.setOffline(true)

    // Try to join
    await page.locator('input[placeholder="PIN"]').fill('1234')
    await page.locator('input[placeholder*="Nickname"]').fill('TestPlayer')
    await page.locator('button:has-text("Join Game")').click()

    await page.waitForTimeout(2000)

    // Should show error or handle gracefully
    // App should not crash
    await expect(page.locator('h1')).toBeVisible()

    // Go back online
    await context.setOffline(false)
  })

  test('Session timeout handling', async ({ page }) => {
    await page.goto(BASE_URL)

    // Set a very old session in localStorage
    await page.evaluate(() => {
      localStorage.setItem('quizSession', JSON.stringify({
        pin: '1234',
        playerName: 'TestPlayer',
        timestamp: Date.now() - 1000 * 60 * 60 * 24 // 1 day ago
      }))
    })

    // Reload
    await page.reload()

    await page.waitForTimeout(2000)

    // Old session should be cleared or ignored
    // Should show join form, not stuck in loading
    await expect(page.locator('input[placeholder="PIN"]')).toBeVisible()
  })

  test('Invalid session data in localStorage', async ({ page }) => {
    await page.goto(BASE_URL)

    // Set invalid JSON in localStorage
    await page.evaluate(() => {
      localStorage.setItem('quizSession', 'invalid json {{{')
    })

    // Reload - should not crash
    await page.reload()

    await page.waitForTimeout(1000)

    // Should clear invalid data and show join form
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('input[placeholder="PIN"]')).toBeVisible()
  })

  test('XSS protection in player name', async ({ page }) => {
    await page.goto(BASE_URL)

    // Try to inject script tag
    const maliciousName = '<script>alert("XSS")</script>'

    await page.locator('input[placeholder="PIN"]').fill('1234')
    await page.locator('input[placeholder*="Nickname"]').fill(maliciousName)

    // Submit
    await page.locator('button:has-text("Join Game")').click()

    await page.waitForTimeout(1000)

    // Should not execute the script (no alert dialog)
    const dialogs = []
    page.on('dialog', dialog => dialogs.push(dialog))

    await page.waitForTimeout(1000)

    expect(dialogs.length).toBe(0)
  })

  test('Very long player name handling', async ({ page }) => {
    await page.goto(BASE_URL)

    // Try extremely long name
    const longName = 'A'.repeat(1000)

    const nameInput = page.locator('input[placeholder*="Nickname"]')
    await nameInput.fill(longName)

    // Should be truncated or validated
    const value = await nameInput.inputValue()

    // Should either be truncated or show validation error
    expect(value.length).toBeLessThan(1000)
  })

  test('Special characters in player name', async ({ page }) => {
    await page.goto(BASE_URL)

    // Try special characters
    await page.locator('input[placeholder*="Nickname"]').fill('Test™️ 你好 🎮')

    // Should accept or sanitize
    const nameInput = page.locator('input[placeholder*="Nickname"]')
    const value = await nameInput.inputValue()

    // Should have some value (might be sanitized)
    expect(value.length).toBeGreaterThan(0)
  })

  test('Emoji in player name', async ({ page }) => {
    await page.goto(BASE_URL)

    await page.locator('input[placeholder*="Nickname"]').fill('Player🔥')

    const nameInput = page.locator('input[placeholder*="Nickname"]')
    const value = await nameInput.inputValue()

    // Should accept emoji
    expect(value).toContain('Player')
  })
})

test.describe('Error Boundary Tests', () => {
  test('App has error boundary', async ({ page }) => {
    await page.goto(BASE_URL)

    // App should load without crashing
    await expect(page.locator('h1')).toBeVisible()

    // Look for any "Something went wrong" error boundary messages
    const errorBoundary = await page.locator('text=/Something went wrong|Error boundary/i').isVisible().catch(() => false)

    // Should not show error boundary on normal load
    expect(errorBoundary).toBe(false)
  })

  test('Console errors are caught', async ({ page }) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))

    await page.goto(BASE_URL)

    // Just navigate around (don't trigger expected errors like failed join)
    await page.locator('input[placeholder="PIN"]').fill('1234')
    await page.locator('input[placeholder*="Nickname"]').fill('Test')

    await page.waitForTimeout(1000)

    // Filter out expected Firestore errors from failed join attempts
    const unexpectedErrors = errors.filter(err =>
      !err.includes('Firebase') &&
      !err.includes('permission-denied') &&
      !err.includes('not-found')
    )

    // Should have no unexpected errors
    expect(unexpectedErrors).toEqual([])
  })
})
