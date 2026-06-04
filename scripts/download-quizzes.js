#!/usr/bin/env node
/**
 * Download quizzes from Firestore to local files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const QUIZZES_DIR = path.join(__dirname, '..', 'quizzes');
const PROJECT_ID = 'devops-quiz-2c930';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// firebase-tools' built-in public OAuth client (not a project secret; see
// upload-quiz.js). Sourced from env or the installed firebase-tools package
// rather than hardcoded here.
function firebaseCliOAuthClient() {
  let id = process.env.FIREBASE_CLIENT_ID;
  let secret = process.env.FIREBASE_CLIENT_SECRET;
  if (id && secret) return { id, secret };
  const strategies = [
    () => require('firebase-tools/lib/api'),
    () => require(path.join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'firebase-tools/lib/api'))
  ];
  for (const load of strategies) {
    try {
      const api = load();
      id = id || api.clientId();
      secret = secret || api.clientSecret();
      if (id && secret) return { id, secret };
    } catch {
      // try next strategy
    }
  }
  return null;
}

// Get access token from the Firebase CLI's cached login.
async function getAccessToken() {
  const configPath = path.join(process.env.HOME || '', '.config', 'configstore', 'firebase-tools.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const tokens = config.tokens || config.user?.tokens;

  if (tokens?.access_token && tokens?.expires_at && tokens.expires_at > Date.now() + 60_000) {
    return tokens.access_token;
  }

  const oauth = firebaseCliOAuthClient();
  if (!tokens?.refresh_token || !oauth) {
    throw new Error('Could not get access token. Run: firebase login (or set FIREBASE_CLIENT_ID/FIREBASE_CLIENT_SECRET).');
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: oauth.id,
      client_secret: oauth.secret,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token'
    })
  });
  if (!res.ok) throw new Error(`Token refresh failed: HTTP ${res.status}`);
  return (await res.json()).access_token;
}

// Convert Firestore format to plain JS
function fromFirestoreValue(value) {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return parseInt(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('stringValue' in value) return value.stringValue;
  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, fromFirestoreValue(v)])
    );
  }
  return null;
}

async function main() {
  console.log('🔐 Authenticating...\n');
  const token = await getAccessToken();

  console.log('📥 Downloading quizzes from Firestore...\n');

  const response = await fetch(`${FIRESTORE_URL}/quizzes?pageSize=100`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await response.json();
  const docs = data.documents || [];

  let count = 0;
  for (const doc of docs) {
    const id = doc.name.split('/').pop();

    // Skip non-lecture quizzes
    if (!id.startsWith('lec')) continue;

    const fields = doc.fields || {};
    const quiz = {};

    for (const [key, value] of Object.entries(fields)) {
      // Skip metadata fields
      if (['id', 'updatedAt', 'questionCount'].includes(key)) continue;
      quiz[key] = fromFirestoreValue(value);
    }

    // Convert ID back to filename: lec1-pre -> lec1_pre.json
    const filename = id.replace('-', '_') + '.json';
    const filepath = path.join(QUIZZES_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(quiz, null, 2));
    console.log(`  ✓ ${filename}`);
    count++;
  }

  console.log(`\n✅ Downloaded ${count} quizzes`);
}

main().catch(console.error);
