// @ts-check
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for Firebase to initialize
    await page.waitForSelector('h1');
    await page.waitForTimeout(2000);
  });

  test('should show teacher link on home page', async ({ page }) => {
    // Check that the "I'm a teacher" link is visible
    const teacherLink = page.getByText(/I'm a teacher/i);
    await expect(teacherLink).toBeVisible();
  });

  test('should protect dashboard from unauthorized access', async ({ page }) => {
    // Try to directly manipulate (simulated)
    // The app should prevent unauthorized dashboard access
    await page.goto('/');
    await page.waitForSelector('h1');

    // Anonymous users clicking teacher link should not get full access
    const button = page.getByText(/I'm a teacher/i);
    await button.click();

    await page.waitForTimeout(3000);

    // Should NOT see dashboard content without proper auth
    // Either shows Access Denied, stays on home, or auth popup appears
    const seesQuizList = await page.getByText('Manage your quizzes').isVisible().catch(() => false);

    // If we see quiz management, user must be authenticated
    // Otherwise, protection is working
    if (seesQuizList) {
      // Check if user email is shown (means properly authenticated)
      const hasEmail = await page.getByText('@').isVisible().catch(() => false);
      expect(hasEmail).toBeTruthy();
    }
  });
});
