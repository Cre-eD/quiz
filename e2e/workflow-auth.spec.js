import { test, expect } from '@playwright/test'
import { loginAdmin, logoutAdmin } from './test-helpers/auth.js'
import { DashboardPage } from './test-helpers/pages/dashboard.page.js'
import { expectHostLobby, getHostPin, joinAsPlayer } from './test-helpers/pages/workflow.page.js'

test.describe.configure({ mode: 'serial' })

test.describe('Local Admin Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page)
  })

  test('admin can access dashboard tabs', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.expectLoaded()
    await dashboard.expectQuizzesTabReady()
    await dashboard.openLeaderboards()
    await expect(page.getByRole('button', { name: /new leaderboard/i })).toBeVisible()
  })

  test('admin can launch a seeded quiz and start gameplay', async ({ page, browser }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.expectLoaded()
    await dashboard.launchFirstQuiz()
    await expectHostLobby(page)

    const pin = await getHostPin(page)
    expect(/^\d{4}$/.test(pin)).toBe(true)
    await expect(page.getByTestId('host-start-game-btn')).toBeDisabled()

    const { playerPage, playerContext } = await joinAsPlayer(browser, { pin, name: 'E2E Player' })

    await expect.poll(async () => {
      const rawCount = await page.getByTestId('host-player-count').textContent()
      return Number.parseInt(rawCount || '0', 10)
    }).toBeGreaterThanOrEqual(1)

    await expect(page.getByTestId('host-start-game-btn')).toBeEnabled()
    await page.getByTestId('host-start-game-btn').click()

    await expect(playerPage.getByTestId('player-question')).toBeVisible()
    await expect(playerPage.getByTestId('player-leave-btn')).toBeVisible()

    await playerPage.close()
    await playerContext.close()
  })

  test('admin can log out through e2e hook', async ({ page }) => {
    await logoutAdmin(page)
    await expect(page.getByTestId('home-teacher-btn')).toBeVisible()
  })
})
