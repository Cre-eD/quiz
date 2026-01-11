# LectureQuiz Pro

Live interactive quiz platform for classrooms. Built with React, Firebase, and real-time updates.

## Features

- **Student Experience**: Join via PIN, answer questions in real-time, see live leaderboard
- **Teacher Dashboard**: Create/edit quizzes, launch sessions, control game flow
- **Real-time Sync**: All players see questions and results simultaneously
- **Modern UI**: Dark theme, animations, confetti for winners
- **Mobile Responsive**: Works on phones, tablets, and desktops

## Tech Stack

- **Frontend**: React (via CDN), TailwindCSS
- **Backend**: Firebase Authentication + Firestore
- **Testing**: Playwright (33 E2E tests)
- **Security**: SOPS + age encryption for quiz storage

## Live Demo

🔗 [https://devops-quiz-2c930.web.app](https://devops-quiz-2c930.web.app)

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Deploy to Firebase
npm run deploy
```

## Quiz Management

Quizzes are encrypted with SOPS and your SSH key.

```bash
# Decrypt quiz for editing
sops -d quizzes/devops-quiz.enc.json > quizzes/devops-quiz.json

# Encrypt after editing
sops -e --output quizzes/devops-quiz.enc.json quizzes/devops-quiz.json
rm quizzes/devops-quiz.json
```

See [`quizzes/README.md`](quizzes/README.md) for details.

## Project Structure

```
├── index.html              # Single-page app
├── quizzes/               # Encrypted quiz files
│   └── *.enc.json         # SOPS-encrypted quizzes
├── scripts/               # Helper scripts
│   ├── quiz-encrypt.sh    # Encrypt quiz files
│   └── quiz-decrypt.sh    # Decrypt quiz files
├── tests/                 # Playwright E2E tests
├── firebase.json          # Firebase hosting config
└── .sops.yaml             # Encryption config
```

## License

MIT
