/**
 * Set Admin Custom Claim (Using Firebase CLI Auth)
 *
 * This script uses Firebase CLI authentication instead of service account keys.
 * Works even when organization policies restrict service account key creation.
 *
 * Prerequisites:
 *   - Firebase CLI installed and logged in (firebase login)
 *   - Admin access to the Firebase project
 *
 * Usage:
 *   node scripts/set-admin-claim-cli.js <email>
 *
 * Example:
 *   node scripts/set-admin-claim-cli.js creeed22@gmail.com
 */

import { execSync } from 'child_process'

const email = process.argv[2]

if (!email) {
  console.error('❌ Error: Email address required')
  console.error('Usage: node scripts/set-admin-claim-cli.js <email>')
  console.error('Example: node scripts/set-admin-claim-cli.js admin@example.com')
  process.exit(1)
}

console.log(`\n🔧 Setting admin claim for: ${email}`)
console.log('This requires Firebase CLI to be logged in with admin privileges.\n')

try {
  // Get user UID from email
  console.log('📝 Looking up user...')
  const getUserCommand = `firebase auth:export /dev/stdout --format=json | jq -r '.users[] | select(.email=="${email}") | .localId'`

  let uid
  try {
    uid = execSync(getUserCommand, { encoding: 'utf-8' }).trim()
  } catch (error) {
    console.error('\n❌ Error: Could not find user or jq is not installed')
    console.error('Please ensure:')
    console.error('  1. The user has signed in at least once')
    console.error('  2. jq is installed (sudo apt-get install jq)')
    console.error('\nAlternatively, use the manual method below.')
    process.exit(1)
  }

  if (!uid) {
    console.error(`\n❌ Error: No user found with email ${email}`)
    console.error('The user must sign in at least once before setting claims.')
    process.exit(1)
  }

  console.log(`✓ Found user: ${email} (UID: ${uid})`)

  // Unfortunately, Firebase CLI doesn't have a direct command to set custom claims
  // We need to use a Cloud Function or manual method
  console.log('\n⚠️  Firebase CLI does not support setting custom claims directly.')
  console.log('Please use one of the alternative methods below:\n')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('METHOD 1: Deploy Cloud Function (Recommended)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('1. Deploy the admin claim Cloud Function:')
  console.log('   npm run deploy:admin-function\n')

  console.log('2. Visit the function URL in your browser:')
  console.log(`   https://us-central1-devops-quiz-2c930.cloudfunctions.net/setAdminClaim?email=${email}\n`)

  console.log('3. The function will set the admin claim and display confirmation.\n')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('METHOD 2: Use Firebase Console')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('1. Go to Firebase Console → Authentication → Users')
  console.log('2. Find your user and copy the UID')
  console.log('3. Use Firebase Extensions or App Check to set custom claims\n')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('METHOD 3: Temporary Workaround')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('For immediate access, you can temporarily use email-based auth:')
  console.log('1. Update firestore.rules to allow email check:')
  console.log(`   request.auth.token.email == "${email}"\n`)
  console.log('2. This is less secure but works without custom claims')
  console.log('3. Remember to switch to custom claims later\n')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log(`User UID for reference: ${uid}`)

} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}
