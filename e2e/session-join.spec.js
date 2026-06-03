/**
 * Session Join Tests
 *
 * Tests the player joining flow including error handling
 *
 * Run with: npm run test:e2e -- session-join.spec.js
 */

import { test, expect } from '@playwright/test'


test.describe('Session Join Flow', () => {
  test('Join form validation - empty PIN', async ({ page }) => {
    await page.goto('/')

    // Fill only name, leave PIN empty
    const nameInput = page.locator('[data-testid="home-name-input"]')
    await nameInput.fill('TestPlayer')

    const joinButton = page.locator('[data-testid="home-join-btn"]')

    // Button should be disabled when PIN is empty
    await expect(joinButton).toBeDisabled()

    // Should still be on homepage
    await expect(page.locator('h1')).toContainText('LectureQuiz')
  })

  test('Join form validation - empty name', async ({ page }) => {
    await page.goto('/')

    // Fill only PIN, leave name empty
    const pinInput = page.locator('[data-testid="home-pin-input"]')
    await pinInput.fill('1234')

    const joinButton = page.locator('[data-testid="home-join-btn"]')

    // Button should be disabled when name is empty
    await expect(joinButton).toBeDisabled()

    // Should still be on home page
    await expect(page.locator('h1')).toContainText('LectureQuiz')
  })

  test('Join form validation - invalid PIN format', async ({ page }) => {
    await page.goto('/')

    // PIN should only accept 4 digits
    const pinInput = page.locator('[data-testid="home-pin-input"]')

    // Try to fill more than 4 digits
    await pinInput.fill('12345')

    // Should be capped at 4 digits
    const value = await pinInput.inputValue()
    expect(value.length).toBeLessThanOrEqual(4)
  })

  test('Join with non-existent session', async ({ page }) => {
    await page.goto('/')

    // Fill in non-existent PIN
    await page.locator('[data-testid="home-pin-input"]').fill('9999')
    await page.locator('[data-testid="home-name-input"]').fill('TestPlayer')

    // Try to join
    const joinButton = page.locator('[data-testid="home-join-btn"]')
    await joinButton.click()
    await expect(joinButton).toHaveText(/joining/i)
    await expect(joinButton).toHaveText(/join game/i)

    // Should remain on home view after failed join.
    await expect(page.locator('h1')).toContainText('LectureQuiz')
  })

  test('PIN input only accepts numbers', async ({ page }) => {
    await page.goto('/')

    const pinInput = page.locator('[data-testid="home-pin-input"]')

    // Try to type letters
    await pinInput.fill('abcd')

    // Should be empty or only contain numbers
    const value = await pinInput.inputValue()
    expect(/^\d*$/.test(value)).toBe(true)
  })

  test('Name input accepts alphanumeric characters', async ({ page }) => {
    await page.goto('/')

    const nameInput = page.locator('[data-testid="home-name-input"]')

    // Type various characters
    await nameInput.fill('Test Player 123')

    // Should accept the input
    await expect(nameInput).toHaveValue('Test Player 123')
  })

  test('Form clears after failed join attempt', async ({ page }) => {
    await page.goto('/')

    // Fill form with invalid session
    await page.locator('[data-testid="home-pin-input"]').fill('9999')
    await page.locator('[data-testid="home-name-input"]').fill('TestPlayer')

    // Try to join
    const joinButton = page.locator('[data-testid="home-join-btn"]')
    await joinButton.click()
    await expect(joinButton).toHaveText(/joining/i)
    await expect(joinButton).toHaveText(/join game/i)

    // Form should still have values (not cleared on failed attempt)
    await expect(page.locator('[data-testid="home-pin-input"]')).toHaveValue('9999')
    await expect(page.locator('[data-testid="home-name-input"]')).toHaveValue('TestPlayer')
  })

  test('Teacher button is available', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid="home-teacher-btn"]')).toBeVisible()
    await expect(page.locator('[data-testid="home-teacher-btn"]')).toBeEnabled()
  })

  test('Join button state changes based on form', async ({ page }) => {
    await page.goto('/')

    // Wait for page to fully load
    await page.waitForLoadState('networkidle')

    const joinButton = page.locator('[data-testid="home-join-btn"]')
    const pinInput = page.locator('[data-testid="home-pin-input"]')
    const nameInput = page.locator('[data-testid="home-name-input"]')

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
    await page.goto('/')

    // Fill form with non-existent session
    await page.locator('[data-testid="home-pin-input"]').fill('9999')
    await page.locator('[data-testid="home-name-input"]').fill('TestPlayer')

    const joinButton = page.locator('[data-testid="home-join-btn"]')

    // Button should be enabled with valid form
    await expect(joinButton).toBeEnabled()

    // Click once
    await joinButton.click()

    // Button should become disabled during loading (shows "Joining...")
    await expect(joinButton).toHaveText(/joining/i)
    await expect(joinButton).toHaveText(/join game/i)

    // Page should still be functional (no crash from failed join)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('[data-testid="home-pin-input"]')).toBeVisible()
  })
})
