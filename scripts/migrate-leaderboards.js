#!/usr/bin/env node
/**
 * Migration script to add course and year fields to existing leaderboards
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore'

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyCKtogNq4zoiAd6dGa16nerndhKj3iA7Hs',
  authDomain: 'devops-quiz-2c930.firebaseapp.com',
  projectId: 'devops-quiz-2c930',
  appId: '1:86349315764:web:2f579516f90219ed20a1e1'
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
