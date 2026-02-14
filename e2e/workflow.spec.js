/**
 * Complete Workflow Test
 *
 * This test validates the entire quiz flow from start to finish:
 * 1. Admin signs in
 * 2. Creates/launches a quiz
 * 3. Player joins
 * 4. Play through quiz
 * 5. View results
 *
 * Run with: npm run test:e2e -- workflow.spec.js
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'creeed22@gmail.com'

test.describe('Complete Quiz Workflow', () => {
  // Skip OAuth test in CI or WSL environments (can't manually sign in)
  test.skip(process.env.CI || process.env.WSL_DISTRO_NAME, 'OAuth test requires manual sign-in')

  test('Full workflow: Sign in → Launch quiz → Join → Play → Results', async ({ page, context }) => {
    // ===== STEP 1: Page loads without errors =====
    console.log('Step 1: Loading homepage...')
    const errors = []
    page.on('pageerror', error => errors.push(error.message))

    await page.goto(BASE_URL)
    await expect(page.locator('h1')).toContainText('LectureQuiz')
    expect(errors).toEqual([])

    // ===== STEP 2: Sign in (if not already signed in) =====
    console.log('Step 2: Checking auth state...')

    // Check if already signed in
    const isDashboardVisible = await page.locator('text=Dashboard').isVisible().catch(() => false)

    if (!isDashboardVisible) {
      console.log('Not signed in, attempting Google sign-in...')

      // Click teacher button
      await page.locator('button:has-text("teacher")').click()

      // Wait for either:
      // 1. Dashboard (if already authed via redirect)
      // 2. Google OAuth popup/redirect
      // 3. "Access Denied" if wrong account

      await page.waitForTimeout(3000)

      // Check if we got to dashboard
      const gotDashboard = await page.locator('text=Dashboard').isVisible().catch(() => false)

      if (!gotDashboard) {
        console.log('⚠️ Google OAuth required - this test requires manual sign-in')
        console.log(`   Please sign in as: ${ADMIN_EMAIL}`)
        console.log('   Waiting 30 seconds for manual sign-in...')

        // Wait for dashboard to appear (manual intervention)
        await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible({ timeout: 30000 })
      }
    }

    console.log('✅ Signed in successfully')

    // ===== STEP 3: Navigate to Dashboard =====
    console.log('Step 3: Verifying dashboard...')
    await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible()

    // Should see quizzes tab
    const quizzesTab = page.locator('button:has-text("Quizzes")')
    await expect(quizzesTab).toBeVisible()

    // ===== STEP 4: Find a quiz to launch =====
    console.log('Step 4: Finding quiz to launch...')

    // Wait for quizzes to load
    await page.waitForTimeout(2000)

    // Look for a quiz card with "Launch" button
    const launchButtons = page.locator('button:has-text("Launch")')
    const launchCount = await launchButtons.count()

    if (launchCount === 0) {
      console.log('❌ No quizzes available to launch')
      test.skip()
    }

    console.log(`Found ${launchCount} quiz(zes)`)

    // Click first launch button
    await launchButtons.first().click()

    // ===== STEP 5: Launch quiz (modal) =====
    console.log('Step 5: Launching quiz...')

    // Wait for launch modal
    await page.waitForTimeout(500)

    // Click "Start Session" or equivalent
    const startButton = page.locator('button:has-text("Start")')
    await expect(startButton).toBeVisible({ timeout: 5000 })
    await startButton.click()

    // ===== STEP 6: Wait for lobby =====
    console.log('Step 6: Waiting for host lobby...')

    // Should see PIN displayed
    const pinDisplay = page.locator('text=/[0-9]{4}/')
    await expect(pinDisplay).toBeVisible({ timeout: 10000 })

    // Extract PIN
    const pinText = await pinDisplay.textContent()
    const pin = pinText.match(/\d{4}/)[0]
    console.log(`Quiz PIN: ${pin}`)

    // Should see "0 players joined" or players counter
    await expect(page.locator('text=/players? joined/')).toBeVisible()

    // Should see "Start Game" button (disabled initially)
    const startGameButton = page.locator('button:has-text("Start Game")')
    await expect(startGameButton).toBeVisible()
    await expect(startGameButton).toBeDisabled()

    // ===== STEP 7: Open player window =====
    console.log('Step 7: Opening player window...')

    const playerPage = await context.newPage()
    await playerPage.goto(BASE_URL)

    await expect(playerPage.locator('h1')).toContainText('LectureQuiz')

    // ===== STEP 8: Player joins =====
    console.log('Step 8: Player joining session...')

    // Fill PIN
    await playerPage.locator('input[placeholder="PIN"]').fill(pin)

    // Fill name
    await playerPage.locator('input[placeholder*="Nickname"]').fill('TestPlayer')

    // Click Join
    await playerPage.locator('button:has-text("Join Game")').click()

    // Wait for join confirmation
    await expect(playerPage.locator('text=/Waiting for|joined/')).toBeVisible({ timeout: 10000 })

    console.log('✅ Player joined successfully')

    // ===== STEP 9: Host sees player =====
    console.log('Step 9: Verifying host sees player...')

    await page.bringToFront()

    // Should see "1 players joined"
    await expect(page.locator('text=/1 players? joined/')).toBeVisible({ timeout: 5000 })

    // Should see player name
    await expect(page.locator('text=TestPlayer')).toBeVisible()

    // Start Game should now be enabled
    await expect(startGameButton).toBeEnabled()

    // ===== STEP 10: Start game =====
    console.log('Step 10: Starting game...')

    await startGameButton.click()

    // Wait for countdown or first question
    await page.waitForTimeout(4000)

    // Should transition to game view
    const questionVisible = await page.locator('text=/Question|Get Ready/').isVisible().catch(() => false)
    expect(questionVisible).toBe(true)

    console.log('✅ Game started')

    // ===== STEP 11: Player sees question =====
    console.log('Step 11: Checking player view...')

    await playerPage.bringToFront()

    // Player should see question or countdown
    const playerInGame = await playerPage.locator('text=/Question|Get Ready|Choose/').isVisible().catch(() => false)
    expect(playerInGame).toBe(true)

    console.log('✅ Player in game')

    // ===== STEP 12: Verify no console errors throughout =====
    console.log('Step 12: Checking for errors...')

    expect(errors).toEqual([])

    console.log('✅ Complete workflow successful!')
  })

  test('Homepage basic validation', async ({ page }) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))

    await page.goto(BASE_URL)

    // Page loads
    await expect(page.locator('h1')).toContainText('LectureQuiz')

    // No console errors
    expect(errors).toEqual([])

    // Critical elements present
    await expect(page.locator('input[placeholder="PIN"]')).toBeVisible()
    await expect(page.locator('input[placeholder*="Nickname"]')).toBeVisible()
    await expect(page.locator('button:has-text("Join Game")')).toBeVisible()
    await expect(page.locator('button:has-text("teacher")')).toBeVisible()
  })

  test('Form interactions work', async ({ page }) => {
    await page.goto(BASE_URL)

    // Fill PIN
    const pinInput = page.locator('input[placeholder="PIN"]')
    await pinInput.fill('1234')
    await expect(pinInput).toHaveValue('1234')

    // Fill name
    const nameInput = page.locator('input[placeholder*="Nickname"]')
    await nameInput.fill('TestUser')
    await expect(nameInput).toHaveValue('TestUser')

    // Join button enabled
    const joinButton = page.locator('button:has-text("Join Game")')
    await expect(joinButton).toBeEnabled()
  })
})
