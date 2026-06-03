/**
 * Generate DevOps Core Course quizzes from lecture markdown.
 *
 * For each lecture N:
 * - Pre: slides 1-10
 * - Mid: slides 11-20
 *
 * Output:
 * - quizzes/devops/lecN_pre.json
 * - quizzes/devops/lecN_mid.json
 *
 * Notes:
 * - These .json files are gitignored; encrypt to .enc.json via sops for committing.
 */

import fs from 'fs';
import path from 'path';
import process from 'process';

const PROJECT_ROOT = process.cwd();
const DEFAULT_LECTURES_DIR = '/home/creed/innouni/DevOps-Core-Course/lectures';
const OUT_DIR = path.join(PROJECT_ROOT, 'quizzes', 'devops');

const FUNNY_DISTRACTORS = [
  'Reboot until it feels better',
  'A feature that only works on Fridays',
  'Summons a YAML dragon to do the work',
  'Because the server asked nicely',
  'Powered by duct tape and optimism',
  'It emails your mistakes to everyone',
];

function usageAndExit(code = 1) {
  console.log(`
Generate DevOps Core quizzes (pre 1-10, mid 11-20) from lecture markdown.

Usage:
  node scripts/generate-devops-core-quizzes.js --from 4 --to 16
  node scripts/generate-devops-core-quizzes.js --lecture 6

Options:
  --lectures-dir <path>   Lectures folder (default: ${DEFAULT_LECTURES_DIR})
  --from <n>              First lecture number (inclusive)
  --to <n>                Last lecture number (inclusive)
  --lecture <n>           Generate only one lecture
  --skip-existing         Do not overwrite existing output files
`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = {
    lecturesDir: DEFAULT_LECTURES_DIR,
    from: null,
    to: null,
    lecture: null,
    skipExisting: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--lectures-dir') args.lecturesDir = argv[++i];
    else if (a === '--from') args.from = Number(argv[++i]);
    else if (a === '--to') args.to = Number(argv[++i]);
    else if (a === '--lecture') args.lecture = Number(argv[++i]);
    else if (a === '--skip-existing') args.skipExisting = true;
    else if (a === '--help') usageAndExit(0);
    else usageAndExit(1);
  }

  return args;
}

function stripDecorations(s) {
  return String(s || '')
    .replace(/[📌📍🎯✅❌🚀🌍😰🔧📝🧠🔍🛠️🗺️📊⏱️💥🐚🐢👉🙈💸💰🐳🔔📦🌐😱💀😨🔥🎮🪟🤝]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLectureTitle(md, lectureNumber) {
  const firstHeading = md.split('\n').find((l) => l.startsWith('# '));
  if (!firstHeading) return `Lecture ${lectureNumber}`;
  const h = stripDecorations(firstHeading.replace(/^#\s+/, ''));
  // e.g. "Lecture 5 — Configuration Management: Ansible Fundamentals"
  const m = h.match(new RegExp(`Lecture\\s+${lectureNumber}\\s+—\\s+(.+)$`));
  return m ? m[1].trim() : h;
}

function parseSlides(md) {
  const slides = new Map();
  const re = /^##\s+📍\s+Slide\s+(\d+)\s+–\s+.*$/gm;
  const indices = [];
  let m;
  while ((m = re.exec(md)) !== null) {
    indices.push({ n: Number(m[1]), i: m.index });
  }
  for (let idx = 0; idx < indices.length; idx++) {
    const cur = indices[idx];
    const next = indices[idx + 1];
    const bodyStart = md.indexOf('\n', cur.i);
    const bodyEnd = next ? next.i : md.length;
    slides.set(cur.n, md.slice(bodyStart, bodyEnd));
  }
  return slides;
}

function extractBullets(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('* '))
    .map((l) => stripDecorations(l.replace(/^\*\s+/, '')))
    .filter(Boolean)
    .filter((l) => !l.toLowerCase().includes('quiz'));
}

function extractTermDefs(text) {
  const out = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line.startsWith('* ')) continue;
    const cleaned = stripDecorations(line.replace(/^\*\s+/, ''));
    const m = cleaned.match(/^\*\*(.+?)\*\*\s*(?:—|=|:-)\s*(.+)$/);
    if (!m) continue;
    const term = stripDecorations(m[1]);
    const def = stripDecorations(m[2]);
    if (!term || !def) continue;
    out.push({ term, def });
  }
  return out;
}

function extractTablePairs(text) {
  const lines = text.split('\n').map((l) => l.trim());
  const pairs = [];

  // Very small heuristic: capture any "| a | b |" rows (skip header separator rows).
  for (const l of lines) {
    if (!l.startsWith('|') || !l.endsWith('|')) continue;
    if (l.includes('---')) continue;
    const cols = l
      .slice(1, -1)
      .split('|')
      .map((c) => stripDecorations(c.trim()))
      .filter(Boolean);
    if (cols.length !== 2) continue;
    if (cols[0].toLowerCase() === 'myth' || cols[0].toLowerCase() === 'problem') continue;
    if (cols[1].toLowerCase() === 'reality' || cols[1].toLowerCase() === 'impact') continue;
    pairs.push({ left: cols[0], right: cols[1] });
  }

  return pairs;
}

function seedRand(seed) {
  // Simple LCG; deterministic, good enough for shuffling options.
  let x = seed >>> 0;
  return () => {
    x = (1664525 * x + 1013904223) >>> 0;
    return x / 0xffffffff;
  };
}

function shuffleInPlace(arr, rnd) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickUnique(arr, k, rnd, excludeSet = new Set()) {
  const candidates = arr.filter((x) => !excludeSet.has(x));
  shuffleInPlace(candidates, rnd);
  return candidates.slice(0, k);
}

function placeCorrect(correct, distractors, desiredIndex, rnd) {
  const opts = [correct, ...distractors];
  // If somehow we got duplicates, de-dupe while preserving order.
  const seen = new Set();
  const uniq = [];
  for (const o of opts) {
    const key = o.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(o);
  }
  while (uniq.length < 4) uniq.push(FUNNY_DISTRACTORS[Math.floor(rnd() * FUNNY_DISTRACTORS.length)]);

  const correctValue = uniq[0];
  const rest = uniq.slice(1, 4);
  const arranged = new Array(4);
  arranged[desiredIndex] = correctValue;
  const restIdx = [0, 1, 2, 3].filter((i) => i !== desiredIndex);
  for (let i = 0; i < restIdx.length; i++) arranged[restIdx[i]] = rest[i];
  return { options: arranged, correctIndex: desiredIndex };
}

function makeQuestionsForRange({ lecture, title, category, slides, slideFrom, slideTo, count }) {
  const rnd = seedRand((lecture + category.length * 131) ^ (slideFrom * 17) ^ (slideTo * 31));

  const slideNums = [];
  for (let n = slideFrom; n <= slideTo; n++) if (slides.has(n)) slideNums.push(n);

  const termDefs = [];
  const bullets = [];
  const tablePairs = [];

  for (const n of slideNums) {
    const body = slides.get(n) || '';
    termDefs.push(...extractTermDefs(body).map((x) => ({ ...x, slide: n })));
    bullets.push(...extractBullets(body).map((b) => ({ text: b, slide: n })));
    tablePairs.push(...extractTablePairs(body).map((p) => ({ ...p, slide: n })));
  }

  const defDistractorPool = termDefs.map((t) => t.def);
  const termDistractorPool = termDefs.map((t) => t.term);
  const bulletPool = bullets.map((b) => b.text);
  const rightPool = tablePairs.map((p) => p.right);

  const questions = [];
  const usedQ = new Set();

  function pushQuestion(q) {
    const key = q.text.toLowerCase();
    if (usedQ.has(key)) return false;
    usedQ.add(key);
    questions.push(q);
    return true;
  }

  // Preferred: term/definition questions.
  for (const td of termDefs) {
    if (questions.length >= count) break;
    const questionText = `What best describes "${td.term}"?`;
    const correct = td.def;
    const exclude = new Set([correct]);
    const distractors = pickUnique(defDistractorPool, 2, rnd, exclude);
    distractors.push(FUNNY_DISTRACTORS[Math.floor(rnd() * FUNNY_DISTRACTORS.length)]);
    const desiredIndex = questions.length % 4;
    const placed = placeCorrect(correct, distractors, desiredIndex, rnd);
    pushQuestion({
      text: questionText,
      options: placed.options,
      correct: placed.correctIndex,
      explanation: `In the lecture, "${td.term}" refers to: ${td.def}.`,
    });
  }

  // Next: table pair questions (left -> right).
  for (const p of tablePairs) {
    if (questions.length >= count) break;
    const left = p.left;
    const right = p.right;
    const questionText = `What is the correct match for: "${left}"?`;
    const correct = right;
    const exclude = new Set([correct]);
    const distractors = pickUnique(rightPool.length ? rightPool : bulletPool, 2, rnd, exclude);
    distractors.push(FUNNY_DISTRACTORS[Math.floor(rnd() * FUNNY_DISTRACTORS.length)]);
    const desiredIndex = questions.length % 4;
    const placed = placeCorrect(correct, distractors, desiredIndex, rnd);
    pushQuestion({
      text: questionText,
      options: placed.options,
      correct: placed.correctIndex,
      explanation: `The lecture pairs "${left}" with "${right}".`,
    });
  }

  // Fallback: bullet recognition questions.
  for (const b of bullets) {
    if (questions.length >= count) break;
    const text = b.text;
    if (text.length < 12) continue;
    const topic =
      stripDecorations(
        text
          .split(/[:—-]/)[0]
          .split(' ')
          .slice(0, 8)
          .join(' ')
      ) || 'this topic';
    const questionText = `Which statement best matches the lecture's point about "${topic}"?`;
    const correct = text;
    const exclude = new Set([correct]);
    const distractors = pickUnique(bulletPool, 2, rnd, exclude);
    distractors.push(FUNNY_DISTRACTORS[Math.floor(rnd() * FUNNY_DISTRACTORS.length)]);
    const desiredIndex = questions.length % 4;
    const placed = placeCorrect(correct, distractors, desiredIndex, rnd);
    pushQuestion({
      text: questionText,
      options: placed.options,
      correct: placed.correctIndex,
      explanation: `The lecture makes this point: ${text}.`,
    });
  }

  // If still short, generate a couple "NOT" questions from term list.
  if (questions.length < count && termDistractorPool.length >= 3) {
    const termsShuffled = [...termDistractorPool];
    shuffleInPlace(termsShuffled, rnd);
    while (questions.length < count) {
      const correctTerm = termsShuffled.pop();
      if (!correctTerm) break;
      const otherTerms = pickUnique(termDistractorPool, 3, rnd, new Set([correctTerm]));
      const questionText = 'Which of the following is NOT a real concept from this lecture section?';
      const correct = 'Reboot-based documentation';
      const desiredIndex = questions.length % 4;
      const placed = placeCorrect(correct, [correctTerm, ...otherTerms], desiredIndex, rnd);
      pushQuestion({
        text: questionText,
        options: placed.options,
        correct: placed.correctIndex,
        explanation: 'The other options are real terms from the lecture; the correct option is the joke.',
      });
    }
  }

  // Enforce exact count.
  return {
    title: `L${lecture}: ${title} — ${category === 'pre' ? 'Pre-Quiz' : 'Mid-Quiz'}`,
    level: lecture,
    category,
    description:
      category === 'pre'
        ? 'Foundations and motivation: why this topic matters and what problems it solves.'
        : 'Core concepts and structure: terminology, building blocks, and practical patterns.',
    questions: questions.slice(0, count),
  };
}

function writeQuiz(filepath, quiz, skipExisting) {
  if (skipExisting && fs.existsSync(filepath)) return false;
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(quiz, null, '\t') + '\n', 'utf8');
  return true;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let lectures = [];
  if (args.lecture != null && Number.isFinite(args.lecture)) lectures = [args.lecture];
  else if (args.from != null && args.to != null) {
    for (let n = args.from; n <= args.to; n++) lectures.push(n);
  } else {
    usageAndExit(1);
  }

  let wrote = 0;
  let skipped = 0;

  for (const lecture of lectures) {
    const mdPath = path.join(args.lecturesDir, `lec${lecture}.md`);
    if (!fs.existsSync(mdPath)) {
      console.error(`Missing lecture markdown: ${mdPath}`);
      process.exitCode = 1;
      continue;
    }

    const md = fs.readFileSync(mdPath, 'utf8');
    const title = extractLectureTitle(md, lecture);
    const slides = parseSlides(md);

    const pre = makeQuestionsForRange({
      lecture,
      title,
      category: 'pre',
      slides,
      slideFrom: 1,
      slideTo: 10,
      count: 10,
    });
    const mid = makeQuestionsForRange({
      lecture,
      title,
      category: 'mid',
      slides,
      slideFrom: 11,
      slideTo: 20,
      count: 12,
    });

    const preOut = path.join(OUT_DIR, `lec${lecture}_pre.json`);
    const midOut = path.join(OUT_DIR, `lec${lecture}_mid.json`);

    const w1 = writeQuiz(preOut, pre, args.skipExisting);
    const w2 = writeQuiz(midOut, mid, args.skipExisting);
    if (w1) wrote++;
    else skipped++;
    if (w2) wrote++;
    else skipped++;
  }

  console.log(`Generated quizzes: wrote=${wrote}, skipped=${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
