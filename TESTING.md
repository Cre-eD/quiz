# Testing Guide

## Test Layers

1. Unit tests (`vitest`)
2. Local deterministic E2E (`playwright` + Firebase emulators)
3. Post-deploy public smoke (`playwright`, no auth flow)

Latest execution/discovery snapshot: `E2E_TEST_SUMMARY.md`.

## Commands

```bash
# Unit
npm test

# Local deterministic E2E (default E2E command)
npm run test:e2e
npm run test:e2e:local

# Local admin workflow only
npm run test:e2e:workflow-admin

# Debug local E2E
npm run test:e2e:headed
npm run test:e2e:debug
npm run test:e2e:ui

# Public smoke after deploy
TEST_URL=https://your-url npm run test:e2e:prod-smoke
```

## Local E2E Environment

`npm run test:e2e:local` starts Auth + Firestore emulators and runs:

- `scripts/e2e/seed-emulators.mjs`
- local Vite app in E2E mode (`npm run dev:e2e`)
- Playwright with `playwright.local.config.js`

Seeded admin user email must match rules:

- `creeed22@gmail.com`

## Security Expectations

- E2E bridge (`window.__E2E_AUTH__`) is local-only.
- Local seeding fails outside approved emulator/project guards.
- `scripts/validate-build.sh` blocks deploy on emulator/test-hook leaks.

## Legacy Note

`tests/` is deprecated for Playwright coverage. Active suite is `e2e/`.
