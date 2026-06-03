import { expect } from '@playwright/test'
import { HomePage } from './home.page.js'

export async function getHostPin(page) {
  const pin = await page.getByTestId('host-pin').textContent()
  return (pin || '').trim()
}

export async function expectHostLobby(page) {
  await expect(page.getByTestId('host-pin')).toBeVisible()
  await expect(page.getByTestId('host-start-game-btn')).toBeVisible()
}

export async function joinAsPlayer(browser, { pin, name = 'E2E Player' }) {
  const playerContext = await browser.newContext()
  const playerPage = await playerContext.newPage()
  const home = new HomePage(playerPage)

  await home.goto()
  await home.join(pin, name)
  await expect(playerPage.getByTestId('player-wait')).toBeVisible()

  return { playerPage, playerContext }
}
