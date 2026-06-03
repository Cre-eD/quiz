import { expect } from '@playwright/test'

export async function loginAdmin(page) {
  await page.goto('/')
  await page.waitForFunction(() => typeof window.__E2E_AUTH__ !== 'undefined')
  await page.waitForFunction(() => typeof window.__E2E_APP__ !== 'undefined')

  await page.evaluate(async () => {
    await window.__E2E_AUTH__.loginAdmin()
  })

  await expect(page.getByTestId('dash-title')).toBeVisible()
}

export async function logoutAdmin(page) {
  await page.waitForFunction(() => typeof window.__E2E_AUTH__ !== 'undefined')
  await page.evaluate(async () => {
    await window.__E2E_AUTH__.logout()
  })

  await expect(page.getByTestId('home-join-btn')).toBeVisible()
}
