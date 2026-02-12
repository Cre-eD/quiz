/**
 * Smoke Test - Production Build Validation
 *
 * This test validates that the production build works correctly
 * by testing critical paths without authentication.
 *
 * Run against preview server: npm run preview
 */

import { test, expect } from '@playwright/test'

test.describe('Production Build Smoke Tests', () => {
  test('Homepage loads without errors', async ({ page }) => {
    const errors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('http://localhost:4173')

    // Check page loads
    await expect(page.locator('h1')).toContainText('LectureQuiz')

    // Check critical elements exist
    await expect(page.locator('input[placeholder="PIN"]')).toBeVisible()
    await expect(page.locator('input[placeholder*="Nickname"]')).toBeVisible()
    await expect(page.locator('button:has-text("Join Game")')).toBeVisible()
    await expect(page.locator('button:has-text("teacher")')).toBeVisible()

    // Check for console errors
    expect(errors).toEqual([])
  })

  test('No emulator configuration in production bundle', async ({ page }) => {
    await page.goto('http://localhost:4173')

    // Check that Firebase is NOT trying to connect to emulators
    const logs = []
    page.on('console', msg => {
      logs.push(msg.text())
    })

    // Wait for Firebase initialization
    await page.waitForTimeout(1000)

    // Should NOT see emulator connection messages
    const emulatorLogs = logs.filter(log =>
      log.includes('localhost:9099') ||
      log.includes('localhost:8080') ||
      log.includes('Connecting to Firebase emulators')
    )

    expect(emulatorLogs).toEqual([])
  })

  test('Can interact with join form', async ({ page }) => {
    await page.goto('http://localhost:4173')

    // Fill in PIN
    const pinInput = page.locator('input[placeholder="PIN"]')
    await pinInput.fill('1234')
    await expect(pinInput).toHaveValue('1234')

    // Fill in name
    const nameInput = page.locator('input[placeholder*="Nickname"]')
    await nameInput.fill('TestPlayer')
    await expect(nameInput).toHaveValue('TestPlayer')

    // Join button should be enabled
    const joinButton = page.locator('button:has-text("Join Game")')
    await expect(joinButton).toBeEnabled()
  })

  test('Critical imports loaded (no undefined errors)', async ({ page }) => {
    const errors = []
    page.on('pageerror', error => {
      errors.push(error.message)
    })

    await page.goto('http://localhost:4173')

    // Wait for app to initialize
    await page.waitForTimeout(1000)

    // Check for reference errors (like "categoryConfig is not defined")
    const referenceErrors = errors.filter(err =>
      err.includes('is not defined') ||
      err.includes('is not a function')
    )

    expect(referenceErrors).toEqual([])
  })

  test('Dashboard page renders for unauthenticated user', async ({ page }) => {
    await page.goto('http://localhost:4173')

    // Click "I'm a teacher" button
    await page.locator('button:has-text("teacher")').click()

    // Should see Google sign-in popup attempt (or redirect)
    // We won't actually sign in, just verify the page doesn't crash
    await page.waitForTimeout(500)

    // Page should still be functional (no crashes)
    await expect(page.locator('h1')).toContainText('LectureQuiz')
  })
})
