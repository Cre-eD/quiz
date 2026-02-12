/**
 * Set Admin Custom Claim
 *
 * This script sets the 'admin' custom claim on a user account using Firebase Admin SDK.
 * Custom claims are server-side verified and cannot be bypassed by clients.
 *
 * Usage:
 *   node scripts/set-admin-claim.js <email>
 *
 * Example:
 *   node scripts/set-admin-claim.js creeed22@gmail.com
 *
 * Prerequisites:
 *   - Firebase service account key file at ./serviceAccountKey.json
 *   - Or set GOOGLE_APPLICATION_CREDENTIALS environment variable
 */

import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Get email from command line argument
const email = process.argv[2]

if (!email) {
  console.error('Error: Email address required')
  console.error('Usage: node scripts/set-admin-claim.js <email>')
  console.error('Example: node scripts/set-admin-claim.js admin@example.com')
  process.exit(1)
}

// Initialize Firebase Admin
try {
  const serviceAccountPath = join(__dirname, '..', 'serviceAccountKey.json')
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })

  console.log('Firebase Admin initialized successfully')
} catch (error) {
  console.error('Error initializing Firebase Admin:', error.message)
  console.error('\nMake sure serviceAccountKey.json exists in the project root.')
  console.error('Download it from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key')
  process.exit(1)
}

// Set admin custom claim
async function setAdminClaim(email) {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email)
    console.log(`Found user: ${user.email} (UID: ${user.uid})`)

    // Set custom claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: true })
    console.log(`✓ Admin claim set successfully for ${user.email}`)
    console.log('\nIMPORTANT: User must sign out and sign in again for the claim to take effect.')

    // Verify the claim was set
    const updatedUser = await admin.auth().getUser(user.uid)
    console.log('Custom claims:', updatedUser.customClaims)

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`Error: No user found with email ${email}`)
      console.error('Make sure the user has signed in at least once.')
    } else {
      console.error('Error setting admin claim:', error.message)
    }
    process.exit(1)
  }
}

// Run the script
setAdminClaim(email).then(() => {
  console.log('\nDone!')
  process.exit(0)
})
