import { test, expect } from '@playwright/test'
import { loginAdmin } from './test-helpers/auth.js'
import { DashboardPage } from './test-helpers/pages/dashboard.page.js'
import { expectHostLobby, getHostPin, joinAsPlayer } from './test-helpers/pages/workflow.page.js'

test.describe.configure({ mode: 'serial' })

const parsePoints = (text) => Number.parseInt((text || '').replace(/[^\d]/g, ''), 10)

const answerCorrect = async (playerPage, delayMs = 0) => {
  const option = playerPage.getByTestId('player-option-0')
  await expect(option).toBeVisible({ timeout: 20000 })
  await expect(option).toBeEnabled()
  if (delayMs > 0) {
    await playerPage.waitForTimeout(delayMs)
  }
  await option.click()
}

test.describe('Fair Gameplay Features', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page)
  })

  test('first blood bonus and fair ranking are visible end-to-end', async ({ page, browser }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.expectLoaded()

    const leaderboardName = `E2E Fair ${Date.now()}`
    await dashboard.openLeaderboards()
    await page.getByRole('button', { name: /new leaderboard/i }).click()
    await expect(page.getByTestId('create-leaderboard-modal')).toBeVisible()
    await page.getByTestId('create-leaderboard-name-input').fill(leaderboardName)
    await page.getByTestId('create-leaderboard-submit-btn').click()

    const leaderboardCard = page.getByTestId('leaderboard-card').filter({ hasText: leaderboardName })
    await expect(leaderboardCard).toBeVisible()

    await dashboard.expectQuizzesTabReady()
    await page.getByTestId('quiz-launch-btn').first().click()
    await expect(page.getByTestId('launch-modal')).toBeVisible()
    await page.getByTestId('launch-modal').locator('label', { hasText: leaderboardName }).click()
    await page.getByTestId('launch-confirm-btn').click()

    await expectHostLobby(page)
    const pin = await getHostPin(page)
    expect(/^\d{4}$/.test(pin)).toBe(true)

    let alphaContext
    let betaContext
    let alphaPage
    let betaPage

    try {
      const alpha = await joinAsPlayer(browser, { pin, name: 'Alpha E2E' })
      alphaContext = alpha.playerContext
      alphaPage = alpha.playerPage

      const beta = await joinAsPlayer(browser, { pin, name: 'Beta E2E' })
      betaContext = beta.playerContext
      betaPage = beta.playerPage

      await expect.poll(async () => {
        const rawCount = await page.getByTestId('host-player-count').textContent()
        return Number.parseInt(rawCount || '0', 10)
      }).toBeGreaterThanOrEqual(2)

      await page.getByTestId('host-start-game-btn').click()
      await expect(page.getByTestId('host-game-phase')).toHaveText('question', { timeout: 20000 })

      await answerCorrect(alphaPage)
      await answerCorrect(betaPage, 500)

      await page.getByRole('button', { name: /show results/i }).click()
      await expect(page.getByTestId('host-game-phase')).toHaveText('results')
      await expect(page.getByTestId('host-results-leaderboard')).toBeVisible()
      await expect(alphaPage.getByTestId('player-results-score')).toBeVisible()
      await expect(betaPage.getByTestId('player-results-score')).toBeVisible()

      const alphaQ1Score = parsePoints(await alphaPage.getByTestId('player-results-score').textContent())
      const betaQ1Score = parsePoints(await betaPage.getByTestId('player-results-score').textContent())
      expect(alphaQ1Score).toBeGreaterThanOrEqual(130)
      expect(alphaQ1Score - betaQ1Score).toBeGreaterThanOrEqual(30)

      await page.getByRole('button', { name: /next question/i }).click()
      await expect(page.getByTestId('host-game-phase')).toHaveText('question', { timeout: 20000 })

      await answerCorrect(betaPage)
      await answerCorrect(alphaPage, 2000)

      await page.getByRole('button', { name: /show results/i }).click()
      await expect(page.getByTestId('host-game-phase')).toHaveText('results')
      await expect(page.getByTestId('host-results-leaderboard')).toBeVisible()
      await page.getByRole('button', { name: /final results/i }).click()
      await expect(page.getByTestId('host-game-phase')).toHaveText('final')

      await expect(page.getByTestId('host-final-leaderboard')).toBeVisible()
      await expect(page.getByTestId('host-final-name-0')).toContainText('Beta E2E')
      await expect(page.getByTestId('host-final-name-1')).toContainText('Alpha E2E')

      const hostTopScore = parsePoints(await page.getByTestId('host-final-score-0').textContent())
      const hostSecondScore = parsePoints(await page.getByTestId('host-final-score-1').textContent())
      expect(hostTopScore).toBe(hostSecondScore)

      await page.getByRole('button', { name: /end session/i }).click()
      await dashboard.expectLoaded()

      await dashboard.openLeaderboards()
      await expect(leaderboardCard).toBeVisible()
      await leaderboardCard.getByTestId('leaderboard-view-btn').click()

      await expect(page.getByTestId('leaderboard-player-row-0')).toBeVisible()
      await expect(page.getByTestId('leaderboard-player-name-0')).toContainText('Beta E2E')
      await expect(page.getByTestId('leaderboard-player-name-1')).toContainText('Alpha E2E')
      await expect(page.getByTestId('leaderboard-player-first-blood-0')).toContainText('first blood')
      await expect(page.getByTestId('leaderboard-player-avg-time-0')).toContainText('avg')
    } finally {
      await alphaPage?.close().catch(() => {})
      await betaPage?.close().catch(() => {})
      await alphaContext?.close().catch(() => {})
      await betaContext?.close().catch(() => {})
    }
  })
})
