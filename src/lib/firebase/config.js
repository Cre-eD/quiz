import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Admin email from environment variable
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

// Test mode - ONLY enabled in development builds for E2E testing
// Triple safeguard: DEV mode + explicit flag + not production mode
// This code is completely removed from production builds by Vite's tree-shaking
export const IS_TEST_MODE =
  import.meta.env.DEV &&
  import.meta.env.VITE_TEST_MODE === 'true' &&
  import.meta.env.MODE !== 'production'

// Failsafe: Throw error if someone tries to enable test mode in production
// This will never trigger in production since the whole block is removed
if (IS_TEST_MODE && import.meta.env.PROD) {
  throw new Error('SECURITY ERROR: Test mode cannot be enabled in production builds')
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

// Connect to Firebase emulators ONLY in development mode
// import.meta.env.DEV ensures this code is completely removed in production builds
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  console.log('🔧 Connecting to Firebase emulators...')
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, 'localhost', 8081)
  console.log('✅ Connected to Firebase emulators')
}
