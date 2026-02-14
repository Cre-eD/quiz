# E2E Tests

## Quick Start

```bash
# Run all unauthenticated tests
npm run test:e2e

# Run specific test
npm run test:e2e -- session-join.spec.js

# Run in headed mode (see browser)
npm run test:e2e:headed

# Generate HTML report
npm run test:e2e:report
```

## Test Modes

### 1. Production Tests (Recommended) ✅

Tests that run against production without authentication - **62 tests passing**.

**What's Tested:**
- Homepage and public pages
- Player join flow and validation
- Form validation and error handling
- Accessibility (WCAG compliance)
- Performance metrics
- Mobile responsiveness
- Security (XSS protection, input sanitization)

**Test Files:**
- `smoke.spec.js` - Production build validation
- `workflow.spec.js` - Basic homepage tests
- `session-join.spec.js` - Player join flow (11 tests)
- `quiz-navigation.spec.js` - Navigation and UI (15 tests)
- `game-flow.spec.js` - Game mechanics and security (14 tests)
- `accessibility.spec.js` - WCAG and performance (24 tests)

### 2. Test Mode (For Admin Testing) ⭐

Use test mode to test authenticated admin features locally.

**Setup:**
```bash
# 1. Start dev server with test mode
npm run dev:test

# 2. Sign in with ANY Google account
# 3. You'll get admin access automatically
```

**What to Test:**
- Admin dashboard
- Quiz creation and management
- Quiz launching and hosting
- Leaderboard management
- All admin workflows

**Automated Tests:**
```bash
npm run test:e2e:test-mode --headed
```

**Security:** Test mode only works in development builds and is completely removed from production. See [../SECURITY.md](../SECURITY.md).

### 3. OAuth Tests (Optional)

For testing production OAuth flow with real authentication.

**Setup (one-time):**
```bash
# Opens browser for manual sign-in
npx playwright test auth.setup.js --headed

# Sign in with: your-admin@email.com
# Auth state saved to .auth/user.json
```

**Run tests:**
```bash
npm run test:e2e -- workflow-auth.spec.js
```

**Note:** Skipped in CI/WSL. Use test mode instead for local testing.

## Running Tests

### All Tests
```bash
npm run test:e2e
```

### Specific Test File
```bash
npm run test:e2e -- session-join.spec.js
npm run test:e2e -- --grep "accessibility"
```

### Debug Mode
```bash
npm run test:e2e:headed    # See browser
npm run test:e2e:debug     # Step-through debugging
npm run test:e2e:ui        # Interactive UI
```

### Generate Report
```bash
npm run test:e2e:report
```

## Test Coverage

### Current Status
- ✅ **62/79 tests passing (78%)**
- ✅ All public features fully tested
- ✅ Zero failures in production suite
- ⏭️ **17 skipped** (OAuth tests in WSL/CI)

### Coverage by Feature

| Feature | Tests | Status |
|---------|-------|--------|
| Homepage & Navigation | 15 | ✅ All passing |
| Player Join Flow | 11 | ✅ All passing |
| Accessibility (WCAG) | 24 | ✅ All passing |
| Performance | 10 | ✅ All passing |
| Mobile Responsive | 3 | ✅ All passing |
| Game Flow & Security | 14 | ✅ All passing |
| Admin Features | Manual | ⭐ Use test mode |

## Writing Tests

### Example Test

```javascript
import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:4173'

test('homepage loads', async ({ page }) => {
  await page.goto(BASE_URL)
  await expect(page.locator('h1')).toContainText('LectureQuiz')
})
```

### Best Practices

1. **Use data-testid** for stable selectors (when available)
2. **Add timeouts** for async operations
3. **Test error cases** not just happy path
4. **Keep tests independent** - don't rely on other tests
5. **Clean up** after tests (if creating data)

## Troubleshooting

### Tests Timeout

```bash
# Increase timeout in playwright.config.js
timeout: 60000  // 60 seconds
```

### Port Already in Use

```bash
# Kill processes on common ports
pkill -f "vite|preview"
```

### Browser Not Found

```bash
# Reinstall Playwright browsers
npx playwright install --with-deps
```

### Auth Tests Fail

Use test mode instead:
```bash
npm run dev:test
# Then manually test admin features
```

## Continuous Integration

Tests run automatically on push/PR:
- ✅ All 62 production tests
- ⏭️ OAuth tests skipped (CI can't handle manual auth)

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
