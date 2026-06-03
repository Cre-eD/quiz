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

// Local emulator mode and E2E mode are development-only by construction.
export const IS_EMULATOR_MODE =
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true'

export const IS_E2E_MODE =
  import.meta.env.DEV &&
  import.meta.env.VITE_E2E_MODE === 'true' &&
  import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true'

export const E2E_ADMIN_PASSWORD = import.meta.env.VITE_E2E_ADMIN_PASSWORD || 'e2e-admin-password'

// Failsafe: E2E mode must never be enabled in production builds.
if (IS_E2E_MODE && import.meta.env.PROD) {
  throw new Error('SECURITY ERROR: E2E mode cannot be enabled in production builds')
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

// Connect to Firebase emulators ONLY in development mode
// import.meta.env.DEV ensures this code is completely removed in production builds
if (IS_EMULATOR_MODE) {
  console.log('🔧 Connecting to Firebase emulators...')
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, 'localhost', 8081)
  console.log('✅ Connected to Firebase emulators')
}
