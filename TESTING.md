# Testing Guide

## Overview

This project has comprehensive testing at multiple levels:

1. **Unit Tests** - Test individual functions and components (Vitest) - 290 passing
2. **E2E Tests** - Test complete user workflows (Playwright) - 62 passing

## Quick Start

```bash
# Run all unit tests
npm test

# Run all E2E tests (production)
npm run test:e2e
```

## E2E Testing with Test Mode ⭐

For testing authenticated admin features locally without OAuth complexity.

### Quick Start

```bash
# 1. Start dev server with test mode
npm run dev:test

# 2. Open browser to http://localhost:5173

# 3. Click "I'm a teacher" and sign in with ANY Google account

# 4. You'll get admin access to test all features
```

### What Gets Tested

With test mode, you can manually test:
- ✅ Admin dashboard access
- ✅ Quiz creation and management
- ✅ Quiz launching (host lobby)
- ✅ Leaderboard management
- ✅ Course/year filtering
- ✅ All admin workflows

### Security

Test mode is **100% safe** for production:
- Only works in development builds (`import.meta.env.DEV`)
- Code is completely removed from production bundles (verified)
- Firestore rules still enforce server-side validation
- See [SECURITY.md](./SECURITY.md) for details

### Automated E2E Tests

Run automated tests against test mode:

```bash
# With dev server running in test mode:
npm run test:e2e:test-mode
```

## Unit Tests

### Running Unit Tests

```bash
# Run once
npm test

# Watch mode (re-run on changes)
npm run test:watch

# With coverage report
npm run test:coverage

# Interactive UI
npm run test:ui
```

### Coverage

Current coverage:
- **Services**: 100% (authentication, quiz, session, leaderboard)
- **Utils**: 100% (validation, sanitization)
- **Total**: 290 tests passing

## E2E Tests (Production)

Tests public features without authentication.

### Running

```bash
# All tests
npm run test:e2e

# Headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# UI mode (interactive)
npm run test:e2e:ui

# Specific test
npm run test:e2e -- session-join.spec.js

# Generate HTML report
npm run test:e2e:report
```

### What's Tested

**62 passing tests covering:**
- Homepage and navigation (15 tests)
- Player join flow (11 tests)
- Accessibility/WCAG (24 tests)
- Performance metrics (10 tests)
- Mobile responsive (3 tests)
- Game flow & security (14 tests)

### Test Files

- `smoke.spec.js` - Production build validation
- `session-join.spec.js` - Player join flow & validation
- `quiz-navigation.spec.js` - Navigation and UI
- `game-flow.spec.js` - Game mechanics, error handling, security
- `accessibility.spec.js` - WCAG compliance, performance, mobile

## OAuth Tests (Optional)

For testing production OAuth flow:

```bash
# One-time setup (requires manual sign-in)
npx playwright test auth.setup.js --headed

# Then run authenticated tests
npm run test:e2e -- workflow-auth.spec.js
```

**Note:** Skipped in CI/WSL environments. Test mode is recommended for local testing.

## Test Reports

View detailed HTML reports:

```bash
npm run test:e2e:report
```

Opens browser with:
- Test results and timing
- Screenshots of failures
- Detailed error context
- Performance metrics

## Continuous Integration

Tests run automatically on every push:
- Unit tests (all 290)
- E2E tests (all 62 public tests)
- OAuth tests skipped (require manual auth)

## For More Details

- [e2e/README.md](./e2e/README.md) - Comprehensive E2E testing guide
- [SECURITY.md](./SECURITY.md) - Test mode security documentation
