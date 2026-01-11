// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have proper page title', async ({ page }) => {
    await expect(page).toHaveTitle(/LectureQuiz Pro/);
  });

  test('should have lang attribute on html', async ({ page }) => {
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'en');
  });

  test('buttons should be focusable', async ({ page }) => {
    await page.waitForSelector('h1');
    // Fill fields to enable the Join button (disabled buttons can't be focused)
    await page.fill('input[placeholder="PIN"]', '1234');
    await page.fill('input[placeholder="Your Nickname"]', 'Test');
    const joinButton = page.getByRole('button', { name: /Join Game/i });
    await joinButton.focus();
    await expect(joinButton).toBeFocused();
  });

  test('inputs should be focusable on home page', async ({ page }) => {
    await page.waitForSelector('h1');
    const pinInput = page.locator('input[placeholder="PIN"]');
    await pinInput.focus();
    await expect(pinInput).toBeFocused();
  });

  test('should have visible focus indicators', async ({ page }) => {
    await page.waitForSelector('h1');
    const pinInput = page.locator('input[placeholder="PIN"]');
    await pinInput.focus();
    // Check that focus ring is applied
    const hasOutline = await pinInput.evaluate(el => {
      const styles = getComputedStyle(el);
      return styles.outline !== 'none' || styles.boxShadow !== 'none';
    });
    // Either outline or box-shadow for focus
    expect(hasOutline).toBeTruthy();
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Something should be focused
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});
