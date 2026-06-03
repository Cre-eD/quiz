import { expect } from '@playwright/test'

export class DashboardPage {
  constructor(page) {
    this.page = page
    this.title = page.getByTestId('dash-title')
    this.quizzesTab = page.getByTestId('dash-tab-quizzes')
    this.leaderboardsTab = page.getByTestId('dash-tab-leaderboards')
    this.signOutButton = page.getByTestId('dash-signout-btn')
    this.launchButtons = page.getByTestId('quiz-launch-btn')
    this.noQuizzesState = page.getByTestId('dash-no-quizzes')
    this.createQuizButton = page.getByTestId('dash-create-quiz-btn')
    this.launchModal = page.getByTestId('launch-modal')
    this.launchConfirmButton = page.getByTestId('launch-confirm-btn')
    this.launchCancelButton = page.getByTestId('launch-cancel-btn')
  }

  async expectLoaded() {
    await expect(this.title).toBeVisible()
  }

  async openQuizzes() {
    await this.quizzesTab.click()
  }

  async openLeaderboards() {
    await this.leaderboardsTab.click()
  }

  async expectQuizzesTabReady() {
    await this.openQuizzes()
    await expect.poll(async () => {
      const launchCount = await this.launchButtons.count()
      const noQuizzes = await this.noQuizzesState.count()
      return launchCount + noQuizzes
    }, { timeout: 30000 }).toBeGreaterThan(0)
  }

  async launchFirstQuiz() {
    await this.expectQuizzesTabReady()
    const launchCount = await this.launchButtons.count()
    if (launchCount === 0) {
      throw new Error('No launchable quizzes found. Check emulator seeding.')
    }
    await this.launchButtons.first().click()
    await expect(this.launchModal).toBeVisible()
    await this.launchConfirmButton.click()
  }
}
