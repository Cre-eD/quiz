#!/usr/bin/env node
/**
 * Quiz file transformation script
 * - Renames devops-l1/l2 to lec1/lec2 format
 * - Splits lec11-16_quiz.json into pre/mid/post files
 * - Standardizes title format
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUIZZES_DIR = path.join(__dirname, '..', 'quizzes');

// Lecture topics for proper titles
const LECTURE_TOPICS = {
  1: 'DevOps Introduction',
  2: 'Docker Fundamentals',
  3: 'CI/CD Fundamentals',
  4: 'GitHub Actions',
  5: 'Kubernetes Basics',
  6: 'Kubernetes Workloads',
  7: 'Kubernetes Networking',
  8: 'Kubernetes Storage',
  9: 'Helm Charts',
  10: 'Kubernetes Security',
  11: 'Secret Management',
  12: 'GitOps & ArgoCD',
  13: 'Monitoring & Observability',
  14: 'Logging & Tracing',
  15: 'Infrastructure as Code',
  16: 'Cloud Native Patterns'
};

const QUIZ_TYPE_NAMES = {
  pre: 'Pre-Quiz',
  mid: 'Mid-Quiz',
  post: 'Post-Quiz'
};

function standardizeTitle(lecture, type) {
  const topic = LECTURE_TOPICS[lecture] || `Lecture ${lecture}`;
  return `L${lecture}: ${topic} — ${QUIZ_TYPE_NAMES[type]}`;
}

function transformQuiz(quiz, lecture, type) {
  return {
    title: standardizeTitle(lecture, type),
    level: lecture,
    category: type,
    questions: quiz.questions
  };
}

// 1. Rename devops-l1/l2 files to lec1/lec2
function renameDevopsFiles() {
  console.log('\n📁 Renaming devops-l1/l2 files...');

  const mappings = [
    { from: 'devops-l1-pre.json', to: 'lec1_pre.json', lecture: 1, type: 'pre' },
    { from: 'devops-l1-mid.json', to: 'lec1_mid.json', lecture: 1, type: 'mid' },
    { from: 'devops-l1-post.json', to: 'lec1_post.json', lecture: 1, type: 'post' },
    { from: 'devops-l2-pre.json', to: 'lec2_pre.json', lecture: 2, type: 'pre' },
    { from: 'devops-l2-mid.json', to: 'lec2_mid.json', lecture: 2, type: 'mid' },
    { from: 'devops-l2-post.json', to: 'lec2_post.json', lecture: 2, type: 'post' },
  ];

  for (const { from, to, lecture, type } of mappings) {
    const fromPath = path.join(QUIZZES_DIR, from);
    const toPath = path.join(QUIZZES_DIR, to);

    if (fs.existsSync(fromPath)) {
      const quiz = JSON.parse(fs.readFileSync(fromPath, 'utf8'));
      const transformed = transformQuiz(quiz, lecture, type);
      fs.writeFileSync(toPath, JSON.stringify(transformed, null, 2));
      console.log(`  ✓ ${from} → ${to}`);
    } else {
      console.log(`  ⚠ ${from} not found`);
    }
  }
}

// 2. Split lec11-16_quiz.json files
function splitCombinedQuizzes() {
  console.log('\n📁 Splitting lec11-16 quiz files...');

  for (let lecture = 11; lecture <= 16; lecture++) {
    const combinedPath = path.join(QUIZZES_DIR, `lec${lecture}_quiz.json`);

    if (!fs.existsSync(combinedPath)) {
      console.log(`  ⚠ lec${lecture}_quiz.json not found`);
      continue;
    }

    const combined = JSON.parse(fs.readFileSync(combinedPath, 'utf8'));

    // Find the keys (DEVOPS_L11_PRE, DEVOPS_L11_MID, DEVOPS_L11_POST)
    const keyMap = {
      pre: `DEVOPS_L${lecture}_PRE`,
      mid: `DEVOPS_L${lecture}_MID`,
      post: `DEVOPS_L${lecture}_POST`
    };

    for (const [type, key] of Object.entries(keyMap)) {
      if (combined[key]) {
        const quiz = transformQuiz(combined[key], lecture, type);
        const outPath = path.join(QUIZZES_DIR, `lec${lecture}_${type}.json`);
        fs.writeFileSync(outPath, JSON.stringify(quiz, null, 2));
        console.log(`  ✓ lec${lecture}_quiz.json → lec${lecture}_${type}.json (${combined[key].questions.length} questions)`);
      } else {
        console.log(`  ⚠ Key ${key} not found in lec${lecture}_quiz.json`);
      }
    }
  }
}

// 3. Update existing lec3-10 files with standardized format
function updateExistingQuizzes() {
  console.log('\n📁 Updating lec3-10 files with standardized format...');

  for (let lecture = 3; lecture <= 10; lecture++) {
    for (const type of ['pre', 'mid', 'post']) {
      const filePath = path.join(QUIZZES_DIR, `lec${lecture}_${type}.json`);

      if (!fs.existsSync(filePath)) {
        console.log(`  ⚠ lec${lecture}_${type}.json not found`);
        continue;
      }

      const quiz = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const transformed = transformQuiz(quiz, lecture, type);
      fs.writeFileSync(filePath, JSON.stringify(transformed, null, 2));
      console.log(`  ✓ lec${lecture}_${type}.json updated`);
    }
  }
}

// 4. List files to be cleaned up
function listCleanup() {
  console.log('\n🗑️  Files that can be removed (old format):');
  const toRemove = [
    'devops-l1-pre.json', 'devops-l1-mid.json', 'devops-l1-post.json',
    'devops-l1-pre.enc.json', 'devops-l1-mid.enc.json', 'devops-l1-post.enc.json',
    'devops-l2-pre.json', 'devops-l2-mid.json', 'devops-l2-post.json',
    'devops-l2-pre.enc.json', 'devops-l2-mid.enc.json', 'devops-l2-post.enc.json',
    'devops-quiz.json', 'devops-quiz.enc.json',
    'test-quiz.json', 'test-quiz.enc.json',
    'lec11_quiz.json', 'lec12_quiz.json', 'lec13_quiz.json',
    'lec14_quiz.json', 'lec15_quiz.json', 'lec16_quiz.json'
  ];

  for (const file of toRemove) {
    const filePath = path.join(QUIZZES_DIR, file);
    if (fs.existsSync(filePath)) {
      console.log(`  - ${file}`);
    }
  }
}

// Main
console.log('🔄 Quiz Transformation Script');
console.log('============================');

renameDevopsFiles();
splitCombinedQuizzes();
updateExistingQuizzes();
listCleanup();

console.log('\n✅ Transformation complete!');
console.log('Run this to remove old files:');
console.log('  rm quizzes/devops-*.json quizzes/devops-*.enc.json quizzes/test-quiz*.json quizzes/lec*_quiz.json');
