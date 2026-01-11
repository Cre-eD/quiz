# Quizzes

Encrypted quiz storage using SOPS + age with SSH key.

## Usage

### View/Edit encrypted quiz
```bash
# Open in your editor (auto-decrypts)
sops quizzes/devops-quiz.enc.json

# Or decrypt to file
sops -d quizzes/devops-quiz.enc.json > quizzes/devops-quiz.json
```

### Create new quiz
```bash
# 1. Create unencrypted JSON
{
  "title": "My New Quiz",
  "questions": [...]
}

# 2. Encrypt it
sops -e --output quizzes/my-new-quiz.enc.json quizzes/my-new-quiz.json

# 3. Delete unencrypted version
rm quizzes/my-new-quiz.json

# Or use the helper script
../scripts/quiz-encrypt.sh quizzes/my-new-quiz.json
```

### Helper scripts
```bash
# Encrypt
../scripts/quiz-encrypt.sh quizzes/quiz.json

# Decrypt
../scripts/quiz-decrypt.sh quizzes/quiz.enc.json
```

## File naming

- `*.json` - Unencrypted (gitignored, never commit)
- `*.enc.json` - Encrypted (safe to commit)
