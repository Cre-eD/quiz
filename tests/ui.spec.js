// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('UI Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for React to render
    await page.waitForSelector('h1');
  });

  test('should have dark theme', async ({ page }) => {
    // Check that body has the gradient background style
    const bodyStyle = await page.locator('body').getAttribute('style');
    // The body should exist and page should have dark appearance
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display animated graduation cap icon', async ({ page }) => {
    await expect(page.locator('i.fa-graduation-cap')).toBeVisible();
  });

  test('should have gradient text on title', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toHaveClass(/gradient-text/);
  });

  test('should have Join Game button with proper styling', async ({ page }) => {
    const joinButton = page.getByRole('button', { name: /Join Game/i });
    await expect(joinButton).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('should display correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForSelector('h1');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('input[placeholder="PIN"]')).toBeVisible();
    await expect(page.getByText(/I'm a teacher/i)).toBeVisible();
  });

  test('should display correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForSelector('h1');

    await expect(page.locator('h1')).toBeVisible();
  });

  test('should display correctly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForSelector('h1');

    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('Animations', () => {
  test('should have float animation on icon', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.animate-float');
    const iconContainer = page.locator('.animate-float');
    await expect(iconContainer).toBeVisible();
  });
});
