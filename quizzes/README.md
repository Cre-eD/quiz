# Quizzes

48 encrypted quiz files (16 lectures x 3 types) using SOPS + age.

## File Naming

```
lec{N}_{type}.enc.json
```

- `N` = Lecture number (1-16)
- `type` = pre, mid, or post

## Usage

```bash
# Decrypt for editing
sops quizzes/lec1_pre.enc.json

# Or decrypt to file
sops -d quizzes/lec1_pre.enc.json > quizzes/lec1_pre.json

# Re-encrypt after editing
sops -e --output quizzes/lec1_pre.enc.json quizzes/lec1_pre.json
rm quizzes/lec1_pre.json
```

## CLI Commands

```bash
# Upload all quizzes to Firestore
npm run upload-all

# Upload specific quiz
npm run upload-quiz -- quizzes/lec1_pre.json

# List quizzes in Firestore
npm run list-quizzes

# Download quizzes from Firestore
node scripts/download-quizzes.js
```

## Quiz Structure

```json
{
  "title": "L1: DevOps Introduction — Pre-Quiz",
  "level": 1,
  "category": "pre",
  "questions": [...]
}
```

## File naming

- `*.json` - Unencrypted (gitignored, never commit)
- `*.enc.json` - Encrypted (safe to commit)
