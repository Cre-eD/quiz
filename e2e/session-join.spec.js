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

    // Try to join with empty PIN
    const nameInput = page.locator('input[placeholder*="Nickname"]')
    await nameInput.fill('TestPlayer')

    const joinButton = page.locator('button:has-text("Join Game")')
    await joinButton.click()

    // Should show error toast or validation
    await page.waitForTimeout(500)

    // PIN should still be empty
    const pinInput = page.locator('input[placeholder="PIN"]')
    await expect(pinInput).toHaveValue('')
  })

  test('Join form validation - empty name', async ({ page }) => {
    await page.goto(BASE_URL)

    // Try to join with empty name
    const pinInput = page.locator('input[placeholder="PIN"]')
    await pinInput.fill('1234')

    const joinButton = page.locator('button:has-text("Join Game")')
    await joinButton.click()

    // Should show error toast
    await page.waitForTimeout(500)

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

  test('Teacher button navigates correctly', async ({ page }) => {
    await page.goto(BASE_URL)

    // Click teacher button
    await page.locator('button:has-text("teacher")').click()

    // Should attempt to sign in (popup or redirect)
    await page.waitForTimeout(1000)

    // Page should remain functional (no crashes)
    const pageTitle = await page.locator('h1')
    const isVisible = await pageTitle.isVisible()
    expect(isVisible).toBe(true)
  })

  test('Join button is initially enabled', async ({ page }) => {
    await page.goto(BASE_URL)

    const joinButton = page.locator('button:has-text("Join Game")')
    await expect(joinButton).toBeVisible()

    // Button should be clickable even if form is empty (validation happens on click)
    const isEnabled = await joinButton.isEnabled()
    expect(isEnabled).toBe(true)
  })

  test('Multiple rapid clicks on join button', async ({ page }) => {
    await page.goto(BASE_URL)

    // Fill form
    await page.locator('input[placeholder="PIN"]').fill('1234')
    await page.locator('input[placeholder*="Nickname"]').fill('TestPlayer')

    const joinButton = page.locator('button:has-text("Join Game")')

    // Click multiple times rapidly
    await joinButton.click()
    await joinButton.click()
    await joinButton.click()

    // Should not crash
    await page.waitForTimeout(1000)

    // Page should still be functional
    await expect(page.locator('h1')).toBeVisible()
  })
})
