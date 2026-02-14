# Security Documentation

## Test Mode Security

### What is Test Mode?

Test mode is a **development-only** feature that allows E2E testing of admin features without OAuth complexity.

### Security Guarantees

Test mode CANNOT be enabled in production. Triple-layer protection:

1. **Build-time check** - `import.meta.env.DEV` is false in production builds
2. **Explicit flag** - Requires `VITE_TEST_MODE=true` 
3. **Mode check** - Cannot be production mode
4. **Tree-shaking** - Vite removes test mode code entirely from production bundles

### How to Use

**Local Testing (Development):**
```bash
# Start dev server with test mode
npm run dev:test

# Or manually:
VITE_TEST_MODE=true npm run dev

# Sign in with ANY Google account
# You'll get admin access for testing
```

**What Test Mode Does:**
- Grants admin UI access to any authenticated (non-anonymous) user
- Allows testing dashboard, quiz management, leaderboards
- **Does NOT bypass Firestore security rules** (server-side validation still applies)

**What Test Mode Does NOT Do:**
- Work in production builds (code is removed)
- Bypass server-side Firestore rules
- Compromise data security

### Verification

Verify test mode is removed from production build:

```bash
npm run build
grep -r "IS_TEST_MODE\|Test mode" dist/

# Expected: no matches (code removed by tree-shaking)
```

### Deployment Safety

✅ `.env.test.local` is in `.gitignore`
✅ Never set `VITE_TEST_MODE=true` in production env
✅ Firestore rules enforce server-side admin checks
✅ Production builds automatically disable test mode

### Firestore Security (Real Protection)

Client-side admin check is just for UX. **Real security is server-side:**

```javascript
// firestore.rules - Server-side validation
match /quizzes/{quizId} {
  allow write: if request.auth != null
    && request.auth.token.email == 'admin@example.com';
}
```

Test mode only affects client UI, not Firestore rules.

### Threat Model

**Attack: Enable test mode in production**
- Result: Fails - code doesn't exist in production bundle

**Attack: Modify bundle to enable test mode**
- Result: UI shows but Firestore rules block all writes

**Attack: Bypass client check**
- Result: Firestore rules still enforce admin email check

