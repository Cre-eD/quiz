# LectureQuiz Pro

Real-time classroom quiz app built with React + Firebase.

## Core Commands

```bash
npm install
npm run dev
npm test
npm run build
```

## E2E Strategy

### Local deterministic E2E (default)

Runs against Firebase Auth/Firestore emulators with seeded data/users:

```bash
npm run test:e2e:local
```

Current status snapshot is tracked in `E2E_TEST_SUMMARY.md`.

### Post-deploy public smoke

Runs smoke checks only (no auth checks):

```bash
TEST_URL=https://your-deployed-url npm run test:e2e:prod-smoke
```

### Admin workflow test only

```bash
npm run test:e2e:workflow-admin
```

## Safe Deployment

```bash
npm run deploy:safe
```

This pipeline runs:

1. Unit tests
2. Local emulator E2E
3. Production build
4. Build leak validation
5. Deploy
6. Post-deploy public smoke

## Security Notes

- Local E2E uses a dev-only hidden bridge: `window.__E2E_AUTH__`.
- Build validation fails if emulator endpoints or E2E hooks leak into `dist/`.
- Firestore production auth rules are unchanged in this refactor.

## Project Structure

- Active E2E: `e2e/`
- Deprecated legacy Playwright files: `tests/` (reference only)
