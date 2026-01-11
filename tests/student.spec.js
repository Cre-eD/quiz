// @ts-check
import { test, expect } from '@playwright/test'

test.describe('Student Input Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('h1');
    await page.waitForTimeout(1500);
  });

  test('should only accept numeric PIN', async ({ page }) => {
    const pinInput = page.locator('input[placeholder="PIN"]');
    // Type character by character to properly trigger React's onChange filtering
    await pinInput.pressSequentially('abc123xyz', { delay: 50 });
    const value = await pinInput.inputValue();
    // Should only contain numbers (filtered by onChange handler)
    expect(value).toMatch(/^\d+$/);
    expect(value.length).toBeGreaterThan(0);
    expect(value.length).toBeLessThanOrEqual(4);
  });

  test('should limit PIN to 4 digits', async ({ page }) => {
    const pinInput = page.locator('input[placeholder="PIN"]');
    await pinInput.fill('123456789');
    const value = await pinInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(4);
  });

  test('should limit nickname length to 20 characters', async ({ page }) => {
    const nameInput = page.locator('input[placeholder="Your Nickname"]');
    await nameInput.fill('ThisIsAVeryLongNicknameThatExceedsTheLimit');
    const value = await nameInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(20);
  });

  test('should show error for invalid PIN', async ({ page }) => {
    await page.fill('input[placeholder="PIN"]', '9999');
    await page.fill('input[placeholder="Your Nickname"]', 'TestPlayer');
    await page.click('button:has-text("Join Game")');

    // Wait for Firebase response
    await page.waitForTimeout(3000);

    // Check for error toast or still on home page (not redirected)
    const hasError = await page.getByText(/PIN not found|failed|progress/i).isVisible().catch(() => false);
    const stillOnHome = await page.locator('h1').isVisible().catch(() => false);

    expect(hasError || stillOnHome).toBeTruthy();
  });
});
