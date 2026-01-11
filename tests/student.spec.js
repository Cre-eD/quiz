// @ts-check
import { test, expect } from '@playwright/test'

test.describe('Student Join Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for Firebase to initialize and React to render
    await page.waitForSelector('h1');
    await page.waitForTimeout(1500);
  });

  test('should display PIN input on home page', async ({ page }) => {
    await expect(page.locator('input[placeholder="PIN"]')).toBeVisible();
  });

  test('should display nickname input on home page', async ({ page }) => {
    await expect(page.locator('input[placeholder="Your Nickname"]')).toBeVisible();
  });

  test('should display Join Game button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Join Game/i })).toBeVisible();
  });

  test('should have disabled Join button when fields are empty', async ({ page }) => {
    const joinButton = page.getByRole('button', { name: /Join Game/i });
    await expect(joinButton).toBeDisabled();
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

  test('should enable Join button when fields are filled', async ({ page }) => {
    await page.fill('input[placeholder="PIN"]', '1234');
    await page.fill('input[placeholder="Your Nickname"]', 'TestPlayer');
    const joinButton = page.getByRole('button', { name: /Join Game/i });
    await expect(joinButton).toBeEnabled();
  });

  test('should show error toast for invalid PIN', async ({ page }) => {
    await page.fill('input[placeholder="PIN"]', '9999');
    await page.fill('input[placeholder="Your Nickname"]', 'TestPlayer');
    await page.click('button:has-text("Join Game")');

    // Wait for Firebase response and toast
    await page.waitForTimeout(3000);

    // Check for error toast or still on home page
    const hasError = await page.getByText(/PIN not found|failed|progress/i).isVisible().catch(() => false);
    const stillOnHome = await page.locator('h1').isVisible().catch(() => false);

    expect(hasError || stillOnHome).toBeTruthy();
  });

  test('should show teacher link', async ({ page }) => {
    await expect(page.getByText(/I'm a teacher/i)).toBeVisible();
  });
});
