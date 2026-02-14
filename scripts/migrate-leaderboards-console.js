/**
 * Browser Console Migration Script
 *
 * Instructions:
 * 1. Open the app at https://devops-quiz-2c930.web.app
 * 2. Log in as admin
 * 3. Open browser DevTools (F12)
 * 4. Go to Console tab
 * 5. Copy and paste this entire script and press Enter
 */

(async function migrateLeaderboards() {
  console.log('🔄 Starting leaderboard migration...\n');

  // Import Firestore functions
  const { doc, updateDoc, getFirestore } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

  // Get Firestore instance (assuming Firebase is already initialized in the app)
  const db = getFirestore();

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

  let migrated = 0;
  let failed = 0;

  for (const [id, metadata] of Object.entries(MAPPINGS)) {
    try {
      const docRef = doc(db, 'leaderboards', id);
      await updateDoc(docRef, {
        course: metadata.course,
        year: metadata.year
      });
      console.log(`✅ Migrated ${id} -> ${metadata.course} ${metadata.year}`);
      migrated++;
    } catch (error) {
      console.error(`❌ Failed ${id}:`, error.message);
      failed++;
    }
  }

  console.log(`\n📊 Migration complete!`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Failed: ${failed}`);
  console.log(`\n🔄 Refresh the page to see the filters`);
})();
