#!/usr/bin/env node
/**
 * Migration script to add course and year fields to existing leaderboards
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore'

const requiredEnv = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID'
]

const missingEnv = requiredEnv.filter((name) => !process.env[name])
if (missingEnv.length > 0) {
  console.error('❌ Missing required environment variables:')
  missingEnv.forEach((name) => console.error(`   - ${name}`))
  console.error('\nSet them before running this script.')
  process.exit(1)
}

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Infer course and year from leaderboard name
function inferMetadata(name) {
  const lowerName = name.toLowerCase()

  // Infer course
  let course = 'devops' // default
  if (lowerName.includes('devsecops intro')) {
    course = 'devsecops-intro'
  } else if (lowerName.includes('devops intro') && lowerName.includes('rus')) {
    course = 'devops-intro-rus'
  } else if (lowerName.includes('devops intro')) {
    course = 'devops-intro'
  }

  // Infer year
  const yearMatch = name.match(/20\d{2}/)
  const year = yearMatch ? parseInt(yearMatch[0]) : 2026

  return { course, year }
}

async function migrateLeaderboards() {
  console.log('🔄 Starting leaderboard migration...\n')

  const leaderboardsRef = collection(db, 'leaderboards')
  const snapshot = await getDocs(leaderboardsRef)

  let migrated = 0
  let skipped = 0

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data()
    const id = docSnap.id

    // Skip if already has course and year
    if (data.course && data.year) {
      console.log(`⏭️  Skipping "${data.name}" (already has course and year)`)
      skipped++
      continue
    }

    // Infer metadata
    const { course, year } = inferMetadata(data.name)

    // Update document
    await updateDoc(doc(db, 'leaderboards', id), {
      course,
      year
    })

    console.log(`✅ Migrated "${data.name}" -> course: ${course}, year: ${year}`)
    migrated++
  }

  console.log(`\n📊 Migration complete!`)
  console.log(`   Migrated: ${migrated}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`   Total: ${snapshot.docs.length}`)

  process.exit(0)
}

migrateLeaderboards().catch(error => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})
