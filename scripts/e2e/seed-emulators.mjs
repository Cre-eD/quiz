import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const REQUIRED_PROJECT_ID = 'demo-project'
const APPROVED_PROJECT_IDS = new Set([REQUIRED_PROJECT_ID])
const REQUIRED_FIRESTORE_PORT = '8081'

const adminEmail = 'creeed22@gmail.com'
const adminPassword = process.env.VITE_E2E_ADMIN_PASSWORD || 'e2e-admin-password'

const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST
const projectId =
  process.env.VITE_FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  process.env.FIREBASE_PROJECT_ID

function fail(message) {
  console.error(`❌ ${message}`)
  process.exit(1)
}

if (!authHost) {
  fail('FIREBASE_AUTH_EMULATOR_HOST is required')
}

if (!firestoreHost) {
  fail('FIRESTORE_EMULATOR_HOST is required')
}

if (!projectId) {
  fail('Project ID is required (VITE_FIREBASE_PROJECT_ID or GCLOUD_PROJECT)')
}

if (!/^(localhost|127\.0\.0\.1):\d+$/.test(authHost)) {
  fail(`Refusing non-local Auth emulator host: ${authHost}`)
}

if (!APPROVED_PROJECT_IDS.has(projectId)) {
  fail(`Refusing to seed non-local project: ${projectId}`)
}

if (!/^(localhost|127\.0\.0\.1):8081$/.test(firestoreHost)) {
  fail(`Expected Firestore emulator on port ${REQUIRED_FIRESTORE_PORT}, got ${firestoreHost}`)
}

if (getApps().length === 0) {
  initializeApp({ projectId })
}

const auth = getAuth()
const db = getFirestore()

async function seedAdminUser() {
  try {
    const existing = await auth.getUserByEmail(adminEmail)
    await auth.updateUser(existing.uid, {
      password: adminPassword,
      emailVerified: true,
      displayName: 'E2E Admin',
    })
    return existing.uid
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') {
      throw error
    }

    const created = await auth.createUser({
      email: adminEmail,
      password: adminPassword,
      emailVerified: true,
      displayName: 'E2E Admin',
    })
    return created.uid
  }
}

async function seedQuiz(ownerUid) {
  const quizId = 'e2e-seeded-quiz'
  const createdAt = Date.now()
  const quiz = {
    id: quizId,
    owner: ownerUid,
    title: 'E2E Seeded Quiz',
    course: 'devops-intro',
    level: 1,
    category: 'pre',
    createdAt,
    questions: [
      {
        text: 'What does CI stand for?',
        options: [
          'Continuous Integration',
          'Container Instance',
          'Cloud Infrastructure',
          'Code Inspection',
        ],
        correct: 0,
        explanation: 'CI stands for Continuous Integration.',
      },
      {
        text: 'Which tool is commonly used for containerization?',
        options: ['Docker', 'Jenkins', 'Terraform', 'Ansible'],
        correct: 0,
        explanation: 'Docker is the most common container runtime for app packaging.',
      },
    ],
  }

  await db.collection('quizzes').doc(quizId).set(quiz, { merge: true })
}

async function run() {
  const uid = await seedAdminUser()
  await seedQuiz(uid)

  console.log('✅ Emulator seed complete')
  console.log(`   Project: ${projectId}`)
  console.log(`   Admin:   ${adminEmail}`)
  console.log('   Quiz:    e2e-seeded-quiz')
}

run().catch((error) => {
  console.error('❌ Failed to seed emulators')
  console.error(error)
  process.exit(1)
})
