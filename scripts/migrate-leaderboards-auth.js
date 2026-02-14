/**
 * Migration script - Run with: firebase functions:shell
 * Or deploy as a one-time function
 */

// Copy this code and run in Firebase Functions Shell or create a temporary HTTP function

const admin = require('firebase-admin');

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Mapping based on leaderboard names
const MAPPINGS = {
  '2ft58l62w': { course: 'devops-intro-rus', year: 2026 },  // DevOps Intro Spring 2026 RUS 2
  '4l2y4fvz6': { course: 'devops-intro', year: 2026 },      // DevOps Intro Spring 2026 ENG 2
  '9hxm3cdpd': { course: 'devops', year: 2026 },            // DevOps Spring 2026 2
  '9q3lzjw8n': { course: 'devops-intro-rus', year: 2026 },  // DevOps Intro Spring 2026 RUS
  'dr54we53w': { course: 'devops-intro', year: 2026 },      // DevOps Intro Spring 2026 ENG
  'itxspfv93': { course: 'devsecops-intro', year: 2026 },   // DevSecOps Intro Spring 2026 2
  'kcm6i6gs7': { course: 'devops', year: 2026 },            // DevOps Spring 2026
  'pfbppjp9z': { course: 'devsecops-intro', year: 2026 }    // DevSecOps Intro Spring 2026
};

async function migrateLeaderboards() {
  console.log('🔄 Starting migration...');

  for (const [id, metadata] of Object.entries(MAPPINGS)) {
    try {
      await db.collection('leaderboards').doc(id).update({
        course: metadata.course,
        year: metadata.year
      });
      console.log(`✅ Migrated ${id} -> ${metadata.course} ${metadata.year}`);
    } catch (error) {
      console.error(`❌ Failed to migrate ${id}:`, error.message);
    }
  }

  console.log('✅ Migration complete!');
}

migrateLeaderboards();
