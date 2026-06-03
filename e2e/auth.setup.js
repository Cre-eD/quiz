/**
 * Optional manual OAuth verification helper.
 *
 * Not part of default local deterministic suite.
 * Use only when manually validating real production OAuth behavior.
 */

import { test as setup } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const authFile = path.join(__dirname, '../.auth/user.json')
const BASE_URL = process.env.TEST_URL || 'https://devops-quiz-2c930.web.app'

setup('authenticate', async ({ page }) => {
  console.log('🔐 Starting authentication setup...')
  console.log('⚠️  This requires manual intervention!')
  console.log('')
  console.log('Steps:')
  console.log('1. Browser will open')
  console.log('2. Click "I\'m a teacher" button')
  console.log('3. Sign in with Google using: creeed22@gmail.com')
  console.log('4. Wait for dashboard to appear')
  console.log('5. Auth state will be saved automatically')
  console.log('')

  await page.goto(BASE_URL)

  // Click teacher button
  await page.locator('button:has-text("teacher")').click()

  console.log('👆 Please sign in now...')

  // Wait for dashboard to appear (manual intervention)
  try {
    await page.waitForSelector('h2:has-text("Dashboard")', { timeout: 120000 }) // 2 minutes

    console.log('✅ Authentication successful!')

    // Save authentication state
    await page.context().storageState({ path: authFile })

    console.log(`📁 Auth state saved to: ${authFile}`)
    console.log('')
    console.log('Manual OAuth validation complete.')

  } catch (error) {
    console.error('❌ Authentication failed or timed out')
    console.error('   Please ensure you sign in within 2 minutes')
    throw error
  }
})
