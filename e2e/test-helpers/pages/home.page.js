import { expect } from '@playwright/test'

export class HomePage {
  constructor(page) {
    this.page = page
    this.pinInput = page.getByTestId('home-pin-input')
    this.nameInput = page.getByTestId('home-name-input')
    this.joinButton = page.getByTestId('home-join-btn')
    this.teacherButton = page.getByTestId('home-teacher-btn')
  }

  async goto() {
    await this.page.goto('/')
    await expect(this.joinButton).toBeVisible()
  }

  async fillJoinForm(pin, name) {
    await this.pinInput.fill(pin)
    await this.nameInput.fill(name)
  }

  async join(pin, name) {
    await this.fillJoinForm(pin, name)
    await this.joinButton.click()
  }
}
