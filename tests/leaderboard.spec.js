// @ts-check
import { test, expect } from '@playwright/test'

test.describe('Leaderboard UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('h1');
  });

  test('should have teacher link to access dashboard', async ({ page }) => {
    const teacherLink = page.getByText(/I'm a teacher/i);
    await expect(teacherLink).toBeVisible();
  });

  test('teacher link should be clickable', async ({ page }) => {
    const teacherLink = page.getByText(/I'm a teacher/i);
    await expect(teacherLink).toBeEnabled();

    // Click should trigger auth flow (won't complete in test env)
    await teacherLink.click();
    await page.waitForTimeout(1000);

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });
});
