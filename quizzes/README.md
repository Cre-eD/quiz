# Quizzes

Multi-course quiz system. **One quiz per lecture** — a single `post` quiz taken
after each lecture. (The earlier `pre`/`mid`/`post` three-quiz model is retired.)

## Folder Structure

```
quizzes/
├── devops/              # DevOps (16 lectures)
├── devops-intro/        # DevOps Intro (English, 10 lectures)
├── devops-intro-rus/    # DevOps Intro (Russian, 10 lectures)
├── devsecops-intro/     # DevSecOps Intro (English, 10 lectures)
├── devsecops-intro-rus/ # DevSecOps Intro (Russian, 10 lectures)
├── sre-intro/           # SRE Intro (English, 10 lectures)
├── sre-intro-rus/       # SRE Intro (Russian, 10 lectures)
└── README.md
```

Each course folder contains one quiz file per lecture, named `lec{N}_post.json`.

## File Naming

```
{course}/lec{N}_post.json
```

- `course` = Folder name (e.g., `devops`, `devsecops-intro`)
- `N` = Lecture number
- `post` = Quiz type — always `post` (one quiz per lecture, taken afterwards)

**Firestore ID format:** `{course}-lec{N}-post` (e.g., `devops-lec1-post`)

## Quiz JSON Schema

```json
{
  "title": "Git & GitHub - Quiz",
  "level": 2,
  "category": "post",
  "description": "VCS basics, Git history, DVCS vs centralized, Working Tree/Staging/Repo model, commits/SHA, branches/HEAD, merge/rebase",
  "questions": [
    {
      "text": "What does VCS stand for?",
      "options": [
        "Version Control System",
        "Visual Code Studio",
        "Virtual Computer Service",
        "Video Capture Software"
      ],
      "correct": 0,
      "explanation": "VCS = Version Control System, a tool for tracking file changes over time."
    }
  ]
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Quiz title with lecture topic |
| `level` | number | Lecture number (1, 2, 3...) |
| `category` | string | Always `"post"` |
| `questions` | array | Array of question objects |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Topics covered (e.g., "Threat modeling basics, STRIDE, attack trees") |

### Question Object

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | The question text |
| `options` | array | Exactly 4 answer options |
| `correct` | number | Index of correct answer (0-3) |
| `explanation` | string | Brief explanation shown after answering |

## Creating a Quiz from a Lecture

### Step 1: Cover the Whole Lecture

One quiz per lecture covers the full slide deck, weighted toward the key
takeaways. (No more splitting into pre/mid/post.)

### Step 2: Question Guidelines

**Target:** ~15 questions per quiz

**Mix of question types:**
- 🎯 **Serious questions** (~60%): Test actual knowledge from slides
- 😄 **Fun questions** (~40%): Humorous wrong answers, relatable scenarios

**Fun question examples:**
```json
{
  "text": "Why is 'final_final_REALLY_final_v3.py' a sign of no VCS?",
  "options": [
    "Python is outdated",
    "The filename is too long",
    "Without VCS, people manually version files in names",
    "'final' is a reserved keyword"
  ],
  "correct": 2
}
```

```json
{
  "text": "What does 'git blame' do?",
  "options": [
    "Sends a complaint to HR about your colleague",
    "Shows who changed each line and when",
    "Deletes the author from commit history",
    "Locks the file from editing"
  ],
  "correct": 1
}
```

### Step 3: Correct Answer Distribution

**IMPORTANT:** Distribute correct answers evenly across indices 0, 1, 2, 3.

For 15 questions: ~4 questions with correct=0, ~4 with correct=1, ~4 with correct=2, ~3 with correct=3

❌ **Bad:** All correct answers at index 0
✅ **Good:** Randomized across all indices

### Step 4: Language Guidelines

For non-English quizzes (e.g., Russian):
- Keep technical terms **untranslated**: Git, GitHub, commit, branch, merge, rebase, HEAD, SHA, CI/CD, DevOps, etc.
- Translate explanations and context
- Keep abbreviations as-is: VCS, DVCS, PR, MR, CLI, etc.

## CLI Commands

```bash
# Upload one quiz
node scripts/upload-quiz.js quizzes/devops/lec1_post.json

# Upload a whole course
node scripts/upload-quiz.js quizzes/devsecops-intro/*.json

# Upload everything
node scripts/upload-quiz.js --all

# List all quizzes in Firestore (grouped by course)
node scripts/upload-quiz.js --list
```

## Storage

- Quiz files are authored as plaintext `lec{N}_post.json` and uploaded to
  **Firestore**, which is the runtime source of truth for the app.
- Plaintext `*.json` quiz files are **gitignored** (not committed).
- SOPS encryption (`*.enc.json`) remains available via `scripts/quiz-encrypt.sh`
  / `scripts/quiz-decrypt.sh` if you want to commit encrypted backups; the
  `.gitignore` whitelists `*.enc.json`. This is optional/legacy — current
  quizzes live only on disk + Firestore.

## Quick Generation Prompt

When asking Claude to generate a quiz:

```
Generate a quiz in [language] for the lecture about [topic]:
- Course folder: quizzes/[course]/
- Lecture number: [N]
- Source: [path to lecture markdown]

Requirements:
- One post-quiz, ~15 questions covering the whole lecture
- Mix fun and serious questions
- Distribute correct answers evenly (0,1,2,3)
- Don't translate: [list technical terms]
- Upload to Firestore after creating
```

## Course Display Names

Used in the dashboard UI. The `courseNames` map is defined in
`src/views/DashboardPage.jsx` (and mirrored in
`src/features/quiz/components/LaunchQuizModal.jsx` and
`src/features/leaderboard/components/LeaderboardCard.jsx`):

| Folder | Display Name |
|--------|--------------|
| `devops` | DevOps |
| `devops-intro` | DevOps Intro |
| `devops-intro-rus` | DevOps Intro (RU) |
| `devsecops-intro` | DevSecOps Intro |
| `devsecops-intro-rus` | DevSecOps Intro (RU) |

> ⚠️ `sre-intro` and `sre-intro-rus` exist as quiz folders/Firestore courses
> but are **not yet** in the `courseNames` map — they render as "Other".
> Add them to each map above to label them in the UI.

To add a new course, create a folder and add it to `courseNames` in the files listed above.
