#!/usr/bin/env node
/**
 * Download quizzes from Firestore to local files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUIZZES_DIR = path.join(__dirname, '..', 'quizzes');
const PROJECT_ID = 'devops-quiz-2c930';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Get access token
function getAccessToken() {
  const configPath = path.join(process.env.HOME || '', '.config', 'configstore', 'firebase-tools.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const tokens = config.tokens || config.user?.tokens;

  const response = execSync(`curl -s -X POST "https://oauth2.googleapis.com/token" \
    -d "client_id=563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com" \
    -d "client_secret=j9iVZfS8kkCEFUPaAeJV0sAi" \
    -d "refresh_token=${tokens.refresh_token}" \
    -d "grant_type=refresh_token"`, { encoding: 'utf8' });

  return JSON.parse(response).access_token;
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
  const token = getAccessToken();

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
