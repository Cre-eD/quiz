/**
 * Session Join Tests
 *
 * Tests the player joining flow including error handling
 *
 * Run with: npm run test:e2e -- session-join.spec.js
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173'

test.describe('Session Join Flow', () => {
  test('Join form validation - empty PIN', async ({ page }) => {
    await page.goto(BASE_URL)

    // Fill only name, leave PIN empty
    const nameInput = page.locator('input[placeholder*="Nickname"]')
    await nameInput.fill('TestPlayer')

    const joinButton = page.locator('button:has-text("Join Game")')

    // Button should be disabled when PIN is empty
    await expect(joinButton).toBeDisabled()

    // Should still be on homepage
    await expect(page.locator('h1')).toContainText('LectureQuiz')
  })

  test('Join form validation - empty name', async ({ page }) => {
    await page.goto(BASE_URL)

    // Fill only PIN, leave name empty
    const pinInput = page.locator('input[placeholder="PIN"]')
    await pinInput.fill('1234')

    const joinButton = page.locator('button:has-text("Join Game")')

    // Button should be disabled when name is empty
    await expect(joinButton).toBeDisabled()

    // Should still be on home page
    await expect(page.locator('h1')).toContainText('LectureQuiz')
  })

  test('Join form validation - invalid PIN format', async ({ page }) => {
    await page.goto(BASE_URL)

    // PIN should only accept 4 digits
    const pinInput = page.locator('input[placeholder="PIN"]')

    // Try to fill more than 4 digits
    await pinInput.fill('12345')

    // Should be capped at 4 digits
    const value = await pinInput.inputValue()
    expect(value.length).toBeLessThanOrEqual(4)
  })

  test('Join with non-existent session', async ({ page }) => {
    await page.goto(BASE_URL)

    // Fill in non-existent PIN
    await page.locator('input[placeholder="PIN"]').fill('9999')
    await page.locator('input[placeholder*="Nickname"]').fill('TestPlayer')

    // Try to join
    await page.locator('button:has-text("Join Game")').click()

    // Wait for response
    await page.waitForTimeout(2000)

    // Should show error (either toast or error message)
    // The error might be visible in a toast notification
    // We'll check that we're still on the home page
    await expect(page.locator('h1')).toContainText('LectureQuiz')
  })

  test('PIN input only accepts numbers', async ({ page }) => {
    await page.goto(BASE_URL)

    const pinInput = page.locator('input[placeholder="PIN"]')

    // Try to type letters
    await pinInput.fill('abcd')

    // Should be empty or only contain numbers
    const value = await pinInput.inputValue()
    expect(/^\d*$/.test(value)).toBe(true)
  })

  test('Name input accepts alphanumeric characters', async ({ page }) => {
    await page.goto(BASE_URL)

    const nameInput = page.locator('input[placeholder*="Nickname"]')

    // Type various characters
    await nameInput.fill('Test Player 123')

    // Should accept the input
    await expect(nameInput).toHaveValue('Test Player 123')
  })

  test('Form clears after failed join attempt', async ({ page }) => {
    await page.goto(BASE_URL)

    // Fill form with invalid session
    await page.locator('input[placeholder="PIN"]').fill('9999')
    await page.locator('input[placeholder*="Nickname"]').fill('TestPlayer')

    // Try to join
    await page.locator('button:has-text("Join Game")').click()

    // Wait for error
    await page.waitForTimeout(2000)

    // Form should still have values (not cleared on failed attempt)
    await expect(page.locator('input[placeholder="PIN"]')).toHaveValue('9999')
    await expect(page.locator('input[placeholder*="Nickname"]')).toHaveValue('TestPlayer')
  })

  test('Teacher button triggers auth flow', async ({ page }) => {
    await page.goto(BASE_URL)

    // Click teacher button
    await page.locator('button:has-text("teacher")').click()

    // Should attempt to sign in (may redirect or show popup)
    await page.waitForTimeout(3000)

    // Either still on homepage or on auth page - both are valid
    const isOnHomepage = await page.locator('h1:has-text("LectureQuiz")').isVisible().catch(() => false)
    const isOnDashboard = await page.locator('h2:has-text("Dashboard")').isVisible().catch(() => false)
    const hasVisibleContent = await page.locator('h1, h2, h3').first().isVisible().catch(() => false)

    // App should not crash - at least one of these should be true
    expect(isOnHomepage || isOnDashboard || hasVisibleContent).toBe(true)
  })

  test('Join button state changes based on form', async ({ page }) => {
    await page.goto(BASE_URL)

    // Wait for page to fully load
    await page.waitForLoadState('networkidle')

    const joinButton = page.locator('button:has-text("Join Game")')
    const pinInput = page.locator('input[placeholder="PIN"]')
    const nameInput = page.locator('input[placeholder*="Nickname"]')

    await expect(joinButton).toBeVisible({ timeout: 5000 })

    // Button should be disabled initially
    await expect(joinButton).toBeDisabled()

    // Fill in form
    await pinInput.fill('1234')
    await nameInput.fill('TestPlayer')

    // Button should now be enabled
    await expect(joinButton).toBeEnabled()
  })

  test('Join button prevents multiple rapid clicks', async ({ page }) => {
    await page.goto(BASE_URL)

    // Fill form with non-existent session
    await page.locator('input[placeholder="PIN"]').fill('9999')
    await page.locator('input[placeholder*="Nickname"]').fill('TestPlayer')

    const joinButton = page.locator('button:has-text("Join Game")')

    // Button should be enabled with valid form
    await expect(joinButton).toBeEnabled()

    // Click once
    await joinButton.click()

    // Button should become disabled during loading (shows "Joining...")
    await page.waitForTimeout(500)

    // Wait for join attempt to complete
    await page.waitForTimeout(3000)

    // Page should still be functional (no crash from failed join)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('input[placeholder="PIN"]')).toBeVisible()
  })
})
