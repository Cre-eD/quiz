# E2E Tests

## Running Tests

```bash
# Run all tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- session-join.spec.js

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run in UI mode (interactive debugging)
npm run test:e2e:ui

# Generate HTML report
npm run test:e2e:report
```

## Authenticated Tests (OAuth Workaround)

Some tests require admin authentication. Here's how to set it up:

### One-Time Setup:

```bash
# 1. Create authentication file (opens browser)
npx playwright test auth.setup.js --headed

# 2. Sign in manually when prompted with: creeed22@gmail.com
# 3. Wait for dashboard to appear
# 4. Auth state saved to .auth/user.json

# 5. Run authenticated tests
npm run test:e2e -- workflow-auth.spec.js
```

### What Gets Saved:
- Authentication cookies
- LocalStorage data
- Session state

### Reusing Auth:
Once `.auth/user.json` exists, authenticated tests will automatically use it. No need to sign in again unless:
- Auth expires (re-run `auth.setup.js`)
- You delete `.auth/user.json`
- Tests fail with auth errors

## Test Files

### Unauthenticated Tests (Always Run)
- **smoke.spec.js** - Production build validation
- **workflow.spec.js** - Basic homepage tests
- **session-join.spec.js** - Player join flow
- **quiz-navigation.spec.js** - Navigation and UI
- **game-flow.spec.js** - Game mechanics and errors
- **accessibility.spec.js** - WCAG compliance and performance

### Authenticated Tests (Require Setup)
- **workflow-auth.spec.js** - Admin dashboard, quiz management, leaderboards

## CI/CD Integration

For automated testing without manual OAuth:

### Option 1: Mock Authentication
```javascript
// In test file
test.use({
  storageState: {
    cookies: [],
    origins: [{
      origin: 'https://devops-quiz-2c930.web.app',
      localStorage: [{
        name: 'firebase:authUser',
        value: JSON.stringify(mockUser)
      }]
    }]
  }
})
```

### Option 2: Use Service Account
```bash
# Set environment variable with service account key
export FIREBASE_SERVICE_ACCOUNT_KEY="..."

# Tests can use admin SDK for authentication
```

### Option 3: Skip in CI
```javascript
// In playwright.config.js
test.skip(process.env.CI && !process.env.AUTH_AVAILABLE)
```

## Troubleshooting

### Auth Setup Fails
```bash
# Increase timeout
npx playwright test auth.setup.js --headed --timeout=180000

# Or manually save auth state:
# 1. Sign in to app in normal browser
# 2. Open DevTools > Application > Storage
# 3. Copy cookies and localStorage
# 4. Create .auth/user.json manually
```

### Tests Timeout
```bash
# Increase global timeout in playwright.config.js
timeout: 60000  // 60 seconds
```

### Auth Expired
```bash
# Simply re-run setup
npx playwright test auth.setup.js --headed
```

## Test Coverage

- ✅ 53/64 tests passing (83%)
- ✅ Homepage and public pages
- ✅ Form validation
- ✅ Error handling
- ✅ Accessibility (WCAG)
- ✅ Performance metrics
- ✅ Mobile responsive
- ⚠️ Admin features (requires auth setup)
