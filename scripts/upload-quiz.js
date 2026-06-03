#!/usr/bin/env node
/**
 * CLI tool to upload quizzes to Firebase Firestore
 * Uses Firebase CLI authentication token
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const QUIZZES_DIR = path.join(PROJECT_ROOT, 'quizzes');
const PROJECT_ID = 'devops-quiz-2c930';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

let accessToken = null;

// Get access token from Firebase CLI
function getAccessToken() {
  if (accessToken) return accessToken;

  // Try Firebase CLI config first (preferred for this project)
  try {
    const configPath = path.join(process.env.HOME || '', '.config', 'configstore', 'firebase-tools.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const tokens = config.tokens || config.user?.tokens;
      // Prefer the cached access token if it exists and is not expired.
      if (tokens?.access_token && tokens?.expires_at && tokens.expires_at > Date.now() + 60_000) {
        accessToken = tokens.access_token;
        return accessToken;
      }
      if (tokens?.refresh_token) {
        // Exchange refresh token for access token
        const response = execSync(`curl -s -X POST "https://oauth2.googleapis.com/token" \
          -H "Content-Type: application/x-www-form-urlencoded" \
          -d "client_id=563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com" \
          -d "client_secret=j9iVZfS8kkCEFUPaAeJV0sAi" \
          -d "refresh_token=${tokens.refresh_token}" \
          -d "grant_type=refresh_token"`, { encoding: 'utf8' });
        const tokenData = JSON.parse(response);
        accessToken = tokenData.access_token;
        return accessToken;
      }
    }
  } catch (e) {
    // Ignore and try gcloud
  }

  // Fall back to gcloud
  try {
    accessToken = execSync('gcloud auth print-access-token 2>/dev/null', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    return accessToken;
  } catch {
    // Ignore
  }

  throw new Error('Could not get access token. Run: firebase login');
}

// Generate quiz ID from filepath (includes course prefix)
function getQuizId(filepath) {
  const relativePath = path.relative(QUIZZES_DIR, filepath);
  const parts = relativePath.split(path.sep);

  if (parts.length >= 2) {
    // e.g., devops/lec1_pre.json → devops-lec1-pre
    const course = parts[0];
    const filename = path.basename(parts[parts.length - 1], '.json').replace('_', '-');
    return `${course}-${filename}`;
  }
  // Fallback for files directly in quizzes/
  return path.basename(filepath, '.json').replace('_', '-');
}

// Extract course name from filepath
function getCourse(filepath) {
  const relativePath = path.relative(QUIZZES_DIR, filepath);
  const parts = relativePath.split(path.sep);
  return parts.length >= 2 ? parts[0] : 'default';
}

// Convert JS object to Firestore document format
function toFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, toFirestoreValue(v)])
        )
      }
    };
  }
  return { stringValue: String(value) };
}

// Validate quiz structure
function validateQuiz(quiz) {
  const errors = [];
  if (!quiz.title) errors.push('Missing title');
  if (!quiz.questions || !Array.isArray(quiz.questions)) errors.push('Missing questions array');
  if (typeof quiz.level !== 'number') errors.push('Missing level');
  if (!quiz.category) errors.push('Missing category');
  return errors;
}

// Upload a single quiz
async function uploadQuiz(filepath) {
  const filename = path.basename(filepath);
  const quizId = getQuizId(filepath);
  const course = getCourse(filepath);

  try {
    const content = fs.readFileSync(filepath, 'utf8');
    const quiz = JSON.parse(content);

    const errors = validateQuiz(quiz);
    if (errors.length > 0) {
      console.log(`  ❌ ${filename}: ${errors.join(', ')}`);
      return { success: false };
    }

    // Add metadata
    const quizData = {
      ...quiz,
      id: quizId,
      course: course,
      updatedAt: new Date().toISOString(),
      questionCount: quiz.questions.length
    };

    const token = getAccessToken();
    const docUrl = `${FIRESTORE_URL}/quizzes/${quizId}`;

    const firestoreDoc = {
      fields: Object.fromEntries(
        Object.entries(quizData).map(([k, v]) => [k, toFirestoreValue(v)])
      )
    };

    const response = await fetch(docUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(firestoreDoc)
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`HTTP ${response.status}: ${err}`);
    }

    console.log(`  ✓ ${filename} → ${quizId} (${quiz.questions.length}q)`);
    return { success: true };

  } catch (err) {
    console.log(`  ❌ ${filename}: ${err.message}`);
    return { success: false };
  }
}

// List quizzes
async function listQuizzes() {
  console.log('\n📋 Quizzes in Firestore:\n');

  try {
    const token = getAccessToken();
    const docs = await fetchAllQuizDocs(token);

    if (docs.length === 0) {
      console.log('  No quizzes found');
      return;
    }

    // Group by course, then by level
    const byCourse = {};
    docs.forEach(doc => {
      const fields = doc.fields || {};
      const course = fields.course?.stringValue || 'default';
      const level = parseInt(fields.level?.integerValue || '0');
      const category = fields.category?.stringValue || 'unknown';
      const title = fields.title?.stringValue || 'Untitled';
      const description = fields.description?.stringValue || null;
      const qCount = fields.questionCount?.integerValue || fields.questions?.arrayValue?.values?.length || 0;
      const id = doc.name.split('/').pop();

      if (!byCourse[course]) byCourse[course] = {};
      if (!byCourse[course][level]) byCourse[course][level] = [];
      byCourse[course][level].push({ id, title, category, qCount, description });
    });

    const courses = Object.keys(byCourse).sort();
    for (const course of courses) {
      console.log(`\n  📚 ${course}:`);
      const levels = Object.keys(byCourse[course]).map(Number).sort((a, b) => a - b);
      for (const level of levels) {
        console.log(`    L${level}:`);
        byCourse[course][level]
          .sort((a, b) => ['pre', 'mid', 'post'].indexOf(a.category) - ['pre', 'mid', 'post'].indexOf(b.category))
          .forEach(q => {
            const icon = { pre: '🟢', mid: '🟡', post: '🔵' }[q.category] || '⚪';
            console.log(`      ${icon} ${q.id} (${q.qCount}q)`);
          });
      }
    }

    console.log(`\n  Total: ${docs.length} quizzes across ${courses.length} courses`);

  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function fetchAllQuizDocs(token) {
  const docs = [];
  let pageToken = null;
  for (;;) {
    const url = new URL(`${FIRESTORE_URL}/quizzes`);
    url.searchParams.set('pageSize', '200');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    docs.push(...(data.documents || []));
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return docs;
}

async function deleteQuizById(token, quizId, { dryRun = false } = {}) {
  if (dryRun) {
    console.log(`  - (dry-run) delete ${quizId}`);
    return { success: true, deleted: false };
  }

  const docUrl = `${FIRESTORE_URL}/quizzes/${quizId}`;
  const response = await fetch(docUrl, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HTTP ${response.status}: ${err}`);
  }

  console.log(`  - deleted ${quizId}`);
  return { success: true, deleted: true };
}

async function purgeQuizzes(token, { course, minLevel, dryRun = false }) {
  const docs = await fetchAllQuizDocs(token);

  const targets = docs
    .map((doc) => {
      const fields = doc.fields || {};
      const quizCourse = fields.course?.stringValue || 'default';
      const level = parseInt(fields.level?.integerValue || '0', 10);
      const id = doc.name.split('/').pop();
      return { id, quizCourse, level };
    })
    .filter((d) => d.quizCourse === course && d.level >= minLevel)
    .sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));

  console.log(`\n🧹 Purging ${targets.length} quiz(es) from Firestore (course=${course}, level>=${minLevel})...\n`);
  let ok = 0;
  let failed = 0;
  for (const t of targets) {
    try {
      await deleteQuizById(token, t.id, { dryRun });
      ok++;
    } catch (e) {
      console.log(`  ! failed ${t.id}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n✅ Purge done: ${ok} ok, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Quiz Upload CLI

Usage:
  npm run upload-quiz -- <files...>    Upload quiz files
  npm run upload-quiz -- --all         Upload all quizzes
  npm run upload-quiz -- --list        List quizzes in Firestore
  npm run upload-quiz -- --purge-devops-from <N> [--dry-run]

Setup:
  gcloud auth login                    Login with Google account

Examples:
  npm run upload-quiz -- quizzes/lec1_pre.json
  npm run upload-quiz -- --all
  npm run upload-quiz -- --purge-devops-from 4
`);
    process.exit(0);
  }

  // Test auth
  try {
    getAccessToken();
    console.log('🔐 Authenticated\n');
  } catch (err) {
    console.error('❌ ' + err.message);
    process.exit(1);
  }

  if (args.includes('--list')) {
    await listQuizzes();
    process.exit(0);
  }

  const purgeIdx = args.indexOf('--purge-devops-from');
  if (purgeIdx !== -1) {
    const n = Number(args[purgeIdx + 1]);
    if (!Number.isFinite(n) || n < 1) {
      console.error('❌ Invalid value for --purge-devops-from');
      process.exit(1);
    }
    const token = getAccessToken();
    const dryRun = args.includes('--dry-run');
    await purgeQuizzes(token, { course: 'devops', minLevel: n, dryRun });
    process.exit(process.exitCode ? 1 : 0);
  }

  // Get files
  let files;
  if (args.includes('--all')) {
    files = await glob(path.join(QUIZZES_DIR, 'lec*_*.json'));
  } else {
    files = [];
    for (const arg of args) {
      if (!arg.startsWith('-')) {
        const matches = await glob(arg);
        files.push(...matches);
      }
    }
  }

  if (files.length === 0) {
    console.error('No quiz files found');
    process.exit(1);
  }

  console.log(`📤 Uploading ${files.length} quiz(es)...\n`);

  let success = 0, failed = 0;
  for (const file of files.sort()) {
    const result = await uploadQuiz(file);
    if (result.success) success++;
    else failed++;
  }

  console.log(`\n✅ Done: ${success} uploaded, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
