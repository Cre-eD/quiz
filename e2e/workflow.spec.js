import { test, expect } from '@playwright/test'

test.describe('Public Workflow', () => {
  test('homepage renders core controls', async ({ page }) => {
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))

    await page.goto('/')
    await expect(page.getByRole('heading', { name: /lecturequiz/i })).toBeVisible()
    await expect(page.getByTestId('home-pin-input')).toBeVisible()
    await expect(page.getByTestId('home-name-input')).toBeVisible()
    await expect(page.getByTestId('home-join-btn')).toBeVisible()
    await expect(page.getByTestId('home-teacher-btn')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('join form enablement works', async ({ page }) => {
    await page.goto('/')

    const joinButton = page.getByTestId('home-join-btn')
    await expect(joinButton).toBeDisabled()

    await page.getByTestId('home-pin-input').fill('1234')
    await expect(joinButton).toBeDisabled()

    await page.getByTestId('home-name-input').fill('WorkflowUser')
    await expect(joinButton).toBeEnabled()
  })
})
