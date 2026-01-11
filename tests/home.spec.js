// @ts-check
import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('h1');
  });

  test('should display app title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('LectureQuiz');
  });

  test('should display PIN input field', async ({ page }) => {
    await expect(page.locator('input[placeholder="PIN"]')).toBeVisible();
  });

  test('should display nickname input field', async ({ page }) => {
    await expect(page.locator('input[placeholder="Your Nickname"]')).toBeVisible();
  });

  test('should display Join Game button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Join Game/i })).toBeVisible();
  });

  test('should display teacher link at bottom', async ({ page }) => {
    await expect(page.getByText(/I'm a teacher/i)).toBeVisible();
  });

  test('should have disabled Join button when fields are empty', async ({ page }) => {
    const joinButton = page.getByRole('button', { name: /Join Game/i });
    await expect(joinButton).toBeDisabled();
  });

  test('should enable Join button when PIN and name are filled', async ({ page }) => {
    await page.fill('input[placeholder="PIN"]', '1234');
    await page.fill('input[placeholder="Your Nickname"]', 'TestPlayer');
    const joinButton = page.getByRole('button', { name: /Join Game/i });
    await expect(joinButton).toBeEnabled();
  });
});
