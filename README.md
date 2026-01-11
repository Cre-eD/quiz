# LectureQuiz Pro

Live interactive quiz platform for classrooms. Built with React + Vite, Firebase, and real-time updates.

## Features

### Core
- **Student Experience**: Join via 4-digit PIN, answer questions in real-time
- **Teacher Dashboard**: Create/edit quizzes, launch sessions, control game flow
- **Real-time Sync**: All players see questions and results simultaneously
- **Cumulative Leaderboards**: Track scores across multiple quiz sessions

### Engagement
- **Answer Streaks**: 2x-4x score multipliers for consecutive correct answers
- **Live Reactions**: Instagram-style floating emojis (students send, teacher sees)
- **Achievement Badges**: First Blood, Speed Demon, On Fire, Perfect Game
- **Confetti**: Celebration animations for correct answers and winners

### UI/UX
- **Page Transitions**: Smooth Framer Motion animations between views
- **Haptic Feedback**: Vibration patterns for mobile devices
- **Screen Shake**: Visual feedback on wrong answers
- **Skeleton Loaders**: Perceived performance improvements
- **Dark Theme**: Modern glassmorphism design

### Moderation
- **Kick/Ban Players**: Remove users with inappropriate nicknames
- **Late Join Toggle**: Allow or block mid-game joins
- **Scalable Player List**: Grid view supports 5-150+ students

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, Framer Motion
- **Backend**: Firebase Authentication + Firestore
- **Testing**: Playwright (38 E2E tests)
- **Security**: SOPS + age encryption for quiz storage
- **Hosting**: Firebase Hosting

## Live Demo

[https://devops-quiz-2c930.web.app](https://devops-quiz-2c930.web.app)

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Deploy to Firebase
npm run deploy
```

## Quiz Management

Quizzes are encrypted with SOPS and age (SSH key-based).

```bash
# Decrypt quiz for editing
sops quizzes/devops-quiz.enc.json

# Or decrypt to file
sops -d quizzes/devops-quiz.enc.json > quizzes/devops-quiz.json

# Encrypt new quiz
sops -e --output quizzes/my-quiz.enc.json quizzes/my-quiz.json
rm quizzes/my-quiz.json
```

See [`quizzes/README.md`](quizzes/README.md) for details.

## Project Structure

```
├── src/
│   ├── App.jsx                # Main application component
│   ├── main.jsx               # Entry point
│   ├── index.css              # Tailwind + custom animations
│   ├── firebase.js            # Firebase configuration
│   ├── constants.js           # Shared constants
│   ├── components/            # Reusable components
│   │   ├── Confetti.jsx
│   │   ├── Skeleton.jsx
│   │   ├── Spinner.jsx
│   │   ├── TimerBar.jsx
│   │   ├── Toast.jsx
│   │   └── ConfirmModal.jsx
│   └── utils/
│       └── haptic.js          # Haptic feedback utility
├── quizzes/                   # Encrypted quiz files
│   └── *.enc.json
├── tests/                     # Playwright E2E tests
├── firebase.json              # Firebase hosting config
├── firestore.rules            # Firestore security rules
├── .sops.yaml                 # SOPS encryption config
├── vite.config.js             # Vite configuration
└── tailwind.config.js         # Tailwind configuration
```

## License

MIT
