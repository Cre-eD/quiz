# Testing Guide

This document outlines the testing strategy for LectureQuiz Pro.

## Quick Start

Before deploying to production, run:

```bash
npm run test:local
```

This will:
1. Run all unit tests
2. Build the production bundle
3. Validate the build (check for emulator leaks, etc.)
4. Start a preview server for manual testing

## Testing Levels

### 1. Unit Tests (Fast, Automated)

**What it tests:** Individual functions, services, utilities in isolation

**Run:**
```bash
npm test              # Watch mode
npm test -- --run     # Single run
npm run test:coverage # With coverage report
npm run test:ui       # Interactive UI
```

**Coverage targets:**
- Services: 100%
- Utils: 100%
- Hooks: 90%
- Components: 80%

**Location:** `src/**/*.test.js`

### 2. Smoke Tests (Fast, Automated)

**What it tests:** Production build works without critical errors

**Run:**
```bash
# Terminal 1: Start preview server
npm run preview

# Terminal 2: Run smoke tests
npx playwright test smoke.spec.js
```

**What it validates:**
- ✅ App loads without console errors
- ✅ No emulator configuration in bundle
- ✅ No "X is not defined" errors
- ✅ Critical UI elements render
- ✅ Forms are interactive

**Location:** `e2e/smoke.spec.js`

### 3. Workflow Tests (Medium, Semi-Automated)

**What it tests:** Complete user workflows from sign-in to quiz completion

**Run:**
```bash
# Terminal 1: Start preview server
npm run preview

# Terminal 2: Run workflow test (watch browser)
npm run test:workflow
```

**What it validates:**
- ✅ Admin can sign in
- ✅ Dashboard loads with quizzes
- ✅ Can launch a quiz session
- ✅ Player can join with PIN
- ✅ Host sees player join
- ✅ Game starts successfully
- ✅ Player sees questions
- ✅ No errors throughout workflow

**Important:** Requires Google OAuth - you may need to sign in manually during the test.

**Location:** `e2e/workflow.spec.js`

### 4. E2E Tests (Slow, Automated)

**What it tests:** Full user workflows end-to-end

**Run:**
```bash
npm run test:e2e           # Headless
npm run test:e2e:headed    # See browser
npm run test:e2e:ui        # Interactive UI
npm run test:e2e:debug     # Debug mode
```

**Location:** `e2e/tests/`

### 5. Manual Testing (Slow, Manual)

**What it tests:** Real user experience, edge cases, visual polish

**Run:**
```bash
npm run test:local
# Opens preview server at http://localhost:4173
```

**Checklist:**
- [ ] Sign in with Google (admin)
- [ ] Dashboard loads correctly
- [ ] Create new quiz
- [ ] Edit existing quiz
- [ ] Delete quiz
- [ ] Create leaderboard
- [ ] Launch quiz session
- [ ] Join as player (incognito/different browser)
- [ ] Play through quiz
- [ ] Check leaderboard
- [ ] No console errors in DevTools

## Pre-Deployment Workflow

### Option 1: Quick Deploy (Skip Manual Testing)
```bash
npm run deploy:prod
```
- Runs unit tests
- Builds production bundle
- Validates build (no emulator leaks)
- Deploys to Firebase

### Option 2: Safe Deploy (With Manual Testing)
```bash
npm run deploy:safe
```
- Runs unit tests
- Builds production bundle
- Validates build
- **Starts preview server for manual testing**
- Waits for confirmation
- Deploys to Firebase

### Option 3: Full Testing (Paranoid Mode)
```bash
# 1. Unit tests
npm test -- --run

# 2. Build
npm run build

# 3. Smoke tests
npm run preview &          # Terminal 1
npx playwright test smoke  # Terminal 2

# 4. E2E tests (optional)
npm run test:e2e

# 5. Manual testing
# Test in browser at http://localhost:4173

# 6. Deploy
npm run deploy:prod
```

## Common Issues & Fixes

### Issue: "categoryConfig is not defined"
**Cause:** Missing import or constant not exported
**Prevention:** Run smoke tests before deploying
**Fix:** Add import/export, redeploy

### Issue: "handleSignInWithGoogle is not a function"
**Cause:** Method name mismatch between service and consumer
**Prevention:** TypeScript (future enhancement)
**Fix:** Fix method name, add unit test

### Issue: App connects to localhost in production
**Cause:** .env.local included in production build
**Prevention:** deploy-prod.sh moves .env.local before building
**Fix:** Rebuild without .env.local

### Issue: Production build crashes but dev works
**Cause:** Minification removes needed code, or import issues
**Prevention:** Run smoke tests on preview server
**Fix:** Check console errors in preview, fix, rebuild

## Continuous Integration (Future)

GitHub Actions workflow will automatically:
- Run unit tests on every PR
- Run smoke tests on every PR
- Run E2E tests on main branch
- Deploy to preview channel for testing
- Deploy to production on merge to main

## Tips

1. **Always run unit tests first** - they're fast and catch most bugs
2. **Use smoke tests before deploying** - catches build/import issues
3. **Test in preview mode locally** - exactly matches production
4. **Check browser console** - many errors only show there
5. **Test in incognito** - fresh state, no cached data
6. **Use different browsers** - Chrome, Firefox, Safari

## Test Philosophy

**Unit Tests:**
- Test behavior, not implementation
- Mock external dependencies (Firebase, etc.)
- Fast and reliable
- High coverage (80%+)

**Smoke Tests:**
- Validate critical paths work
- No authentication required
- Quick sanity check before deploy
- Catches build/bundle issues

**E2E Tests:**
- Test real user workflows
- Use Firebase emulator
- Slower but comprehensive
- Focus on happy paths + critical edge cases

**Manual Tests:**
- Real Firebase (not emulator)
- Visual polish and UX
- Edge cases too complex to automate
- Pre-production validation

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles/)
