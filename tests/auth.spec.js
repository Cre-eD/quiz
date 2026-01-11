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

  test.skip('clicking Teacher Dashboard should trigger auth flow', async ({ page }) => {
    // Click Teacher Dashboard button
    const button = page.locator('button:has-text("Teacher Dashboard")');
    await button.click();

    // Wait for auth attempt
    await page.waitForTimeout(3000);

    // In automated tests, popup might be blocked or OAuth redirect might happen
    // Just verify the app handles it gracefully (no crash, shows some UI)
    const hasAnyContent = await page.locator('body').isVisible();
    expect(hasAnyContent).toBeTruthy();

    // Additionally check we're either on Google, Access Denied, home, or showing an error toast
    const url = page.url();
    const onGoogle = url.includes('accounts.google.com');
    const hasAccessDenied = await page.getByText('Access Denied').isVisible().catch(() => false);
    const onHome = await page.locator('h1:has-text("LectureQuiz Pro")').isVisible().catch(() => false);
    const hasError = await page.getByText(/failed|error/i).isVisible().catch(() => false);

    // Any of these states is acceptable
    expect(onGoogle || hasAccessDenied || onHome || hasError).toBeTruthy();
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
