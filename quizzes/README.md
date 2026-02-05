# Quizzes

Multi-course quiz system with SOPS encryption support.

## Folder Structure

```
quizzes/
├── devops/              # DevOps course (16 lectures)
├── devops-intro/        # DevOps Intro (English)
├── devops-intro-rus/    # DevOps Intro (Russian)
├── devsecops-intro/     # DevSecOps Intro
└── README.md
```

Each course folder contains quiz files named `lec{N}_{type}.json` (or `.enc.json` for encrypted).

## File Naming

```
{course}/lec{N}_{type}.json
```

- `course` = Folder name (e.g., `devops`, `devsecops-intro`)
- `N` = Lecture number
- `type` = `pre`, `mid`, or `post`

**Firestore ID format:** `{course}-lec{N}-{type}` (e.g., `devops-lec1-pre`)

## Quiz JSON Schema

```json
{
  "title": "Git & GitHub - Pre-Quiz (Slides 1-12)",
  "level": 2,
  "category": "pre",
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
| `title` | string | Quiz title with lecture topic and slide range |
| `level` | number | Lecture number (1, 2, 3...) |
| `category` | string | `"pre"`, `"mid"`, or `"post"` |
| `questions` | array | Array of question objects |

### Question Object

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | The question text |
| `options` | array | Exactly 4 answer options |
| `correct` | number | Index of correct answer (0-3) |
| `explanation` | string | Brief explanation shown after answering |

## Creating Quizzes from Lectures

### Step 1: Divide the Lecture into 3 Parts

For a lecture with N slides:
- **Pre-quiz**: Slides 1 to ~N/3 (intro concepts)
- **Mid-quiz**: Slides ~N/3 to ~2N/3 (core content)
- **Post-quiz**: Slides ~2N/3 to N (advanced topics, case studies)

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
# Upload specific quizzes
node scripts/upload-quiz.js quizzes/devops/lec1_pre.json

# Upload multiple quizzes
node scripts/upload-quiz.js quizzes/devsecops-intro/*.json

# List all quizzes in Firestore (grouped by course)
node scripts/upload-quiz.js --list

# Decrypt encrypted quiz for editing
sops -d quizzes/devops/lec1_pre.enc.json > quizzes/devops/lec1_pre.json

# Re-encrypt after editing
sops -e --output quizzes/devops/lec1_pre.enc.json quizzes/devops/lec1_pre.json
rm quizzes/devops/lec1_pre.json
```

## File Types

- `*.json` - Unencrypted (gitignored, never commit)
- `*.enc.json` - Encrypted with SOPS (safe to commit)

## Quick Generation Prompt

When asking Claude to generate quizzes:

```
Generate 3 quizzes in [language] for lecture about [topic]:
- Course folder: quizzes/[course]/
- Lecture number: [N]
- Source: [path to lecture markdown]

Requirements:
- Pre-quiz: ~15 questions covering slides 1-X
- Mid-quiz: ~15 questions covering slides X-Y
- Post-quiz: ~15 questions covering slides Y-Z
- Mix fun and serious questions
- Distribute correct answers evenly (0,1,2,3)
- Don't translate: [list technical terms]
- Upload to Firestore after creating
```

## Course Display Names

Used in the dashboard UI:

| Folder | Display Name |
|--------|--------------|
| `devops` | DevOps |
| `devops-intro` | DevOps Intro |
| `devops-intro-rus` | DevOps Intro (RU) |
| `devsecops-intro` | DevSecOps Intro |

To add a new course, create a folder and add it to `courseNames` in `src/App.jsx`.
