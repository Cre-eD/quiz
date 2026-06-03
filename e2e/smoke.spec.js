import { test, expect } from '@playwright/test'

test.describe('Production Smoke Tests', () => {
  test('homepage loads without runtime errors', async ({ page }) => {
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await page.goto('/')
    await expect(page.getByTestId('home-join-btn')).toBeVisible()
    await expect(page.getByTestId('home-pin-input')).toBeVisible()
    await expect(page.getByTestId('home-name-input')).toBeVisible()
    await expect(pageErrors).toEqual([])
  })

  test('bundle does not reference emulator endpoints', async ({ page }) => {
    const logs = []
    page.on('console', (msg) => logs.push(msg.text()))

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const allLogs = logs.join('\n')
    expect(allLogs).not.toContain('localhost:9099')
    expect(allLogs).not.toContain('localhost:8081')
    expect(allLogs).not.toContain('Connecting to Firebase emulators')
  })

  test('join form can be filled', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('home-pin-input').fill('1234')
    await page.getByTestId('home-name-input').fill('SmokePlayer')

    await expect(page.getByTestId('home-pin-input')).toHaveValue('1234')
    await expect(page.getByTestId('home-name-input')).toHaveValue('SmokePlayer')
    await expect(page.getByTestId('home-join-btn')).toBeEnabled()
  })

  test('teacher button is visible for public smoke', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('home-teacher-btn')).toBeVisible()
  })
})
