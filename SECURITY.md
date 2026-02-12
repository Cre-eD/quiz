# Security Documentation

## Overview

LectureQuiz Pro implements multiple layers of security to protect user data and prevent unauthorized access. This document outlines security measures, setup procedures, and best practices.

---

## Security Features

### 1. Server-Side Authorization
- **Custom Claims**: Admin privileges verified server-side via Firebase custom claims
- **Firestore Security Rules**: Server-enforced access control (cannot be bypassed by clients)
- **Field-Level Validation**: All data writes validated for type, length, and format

### 2. Input Security
- **XSS Prevention**: All user input sanitized using DOMPurify
- **Input Validation**: Length limits, format checks, required field validation
- **Type Safety**: Firestore rules enforce data types

### 3. Cryptographic Security
- **Secure Random Generation**: Uses `crypto.getRandomValues()` instead of `Math.random()`
- **Session PINs**: 4-digit cryptographically secure random PINs
- **Unique IDs**: Collision-resistant ID generation for quizzes and leaderboards

### 4. Environment Security
- **No Hardcoded Secrets**: All sensitive config in environment variables
- **Service Account Protection**: Firebase Admin SDK keys never committed to git
- **Environment Isolation**: Separate configs for development/production

---

## Admin Setup

### Initial Admin Account Setup

1. **Download Firebase Service Account Key**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `serviceAccountKey.json` in project root
   - **NEVER commit this file to git** (already in .gitignore)

2. **Set Admin Custom Claim**
   ```bash
   node scripts/set-admin-claim.js your-email@example.com
   ```

3. **Sign Out and Sign In**
   - User must sign out and sign in again for the claim to take effect
   - Custom claims are included in the auth token on next sign-in

4. **Verify Admin Access**
   - Sign in to the application
   - You should now have access to the Dashboard and admin features

### Adding Additional Admins

Repeat steps 1-3 for each admin user. You can verify current custom claims:

```bash
node scripts/verify-admin.js your-email@example.com
```

---

## Firestore Security Rules

### Current Rules Summary

**Quizzes** (`/quizzes/{quizId}`)
- Read: Anyone
- Create/Update/Delete: Admin only
- Validation: Title 1-200 chars, 1-100 questions

**Sessions** (`/sessions/{sessionId}`)
- Read: Authenticated users only
- Create/Delete: Admin only
- Update (Admin): Can modify any field
- Update (Players): Can only modify `answers`, `reactions`, `scores`, `streaks`, `coldStreaks`, `badges`
- Validation: 4-digit PIN format, required fields

**Leaderboards** (`/leaderboards/{leaderboardId}`)
- Read: Anyone
- Create/Update/Delete: Admin only
- Validation: Name 1-100 chars

### Testing Rules Locally

Use Firebase Emulator to test rules without affecting production:

```bash
firebase emulators:start
```

Then update your `.env.local`:
```bash
VITE_USE_FIREBASE_EMULATOR=true
```

### Deploying Rules

```bash
firebase deploy --only firestore:rules
```

**IMPORTANT**: Test rules in emulator first to avoid breaking production access.

---

## Input Sanitization

All user-generated content is sanitized before storage and display:

### Sanitization Functions (`src/shared/utils/sanitization.js`)

```javascript
import { sanitizeHTML, sanitizePlayerName, sanitizeQuiz } from '@/shared/utils/sanitization'

// Strip all HTML tags, keep content
const clean = sanitizeHTML(userInput)

// Sanitize player name (max 30 chars)
const safeName = sanitizePlayerName(playerName)

// Sanitize entire quiz object
const safeQuiz = sanitizeQuiz(quizData)
```

### Where Sanitization is Applied

- Player names (join form)
- Quiz titles and questions (quiz editor, import)
- Session messages and reactions
- Leaderboard names
- All text rendered from user input

---

## Rate Limiting

The following operations are rate-limited to prevent abuse:

| Operation | Limit | Implementation |
|-----------|-------|----------------|
| Session Join | 3 attempts/minute | Client-side + Firestore rules |
| Answer Submit | 1 per question | Session state validation |
| Quiz Save | 5 per minute | Client-side debounce |
| Reaction Send | 10 per minute | Client-side throttle |

Rate limiting is implemented in `src/shared/utils/rateLimit.js`.

---

## Vulnerability Mitigation

### Resolved Security Issues

1. ✅ **Hardcoded API Keys** → Moved to environment variables
2. ✅ **Hardcoded Admin Email** → Custom claims with server-side verification
3. ✅ **Client-Side Admin Check** → Firestore rules enforce server-side
4. ✅ **Weak PIN Generation** → Cryptographically secure random (crypto.getRandomValues)
5. ✅ **XSS Vulnerabilities** → DOMPurify sanitization on all user input
6. ✅ **Session Data Exposure** → Firestore rules restrict read access to authenticated users
7. ✅ **Unrestricted Updates** → Field-level restrictions in Firestore rules
8. ✅ **No Input Validation** → Comprehensive validation in rules and client

### Ongoing Security Practices

- **Dependency Updates**: Run `npm audit` and `npm update` regularly
- **Security Reviews**: Review Firestore rules before each deployment
- **Access Monitoring**: Monitor Firebase Console for suspicious activity
- **Principle of Least Privilege**: Grant minimum necessary permissions

---

## Environment Variables

### Required Variables

**.env** (Production)
```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_ADMIN_EMAIL=admin@example.com
VITE_ENVIRONMENT=production
```

**.env.local** (Development)
```bash
VITE_FIREBASE_API_KEY=demo-project
VITE_FIREBASE_AUTH_DOMAIN=localhost
VITE_FIREBASE_PROJECT_ID=demo-project
VITE_FIREBASE_APP_ID=demo-app
VITE_ADMIN_EMAIL=admin@localhost
VITE_ENVIRONMENT=development
VITE_USE_FIREBASE_EMULATOR=true
```

### Security Notes

- **Never commit .env files** (already in .gitignore)
- Firebase API keys are safe to expose in client-side code (protected by Firestore rules and domain restrictions)
- Admin email in .env is only for UI display; actual authorization uses custom claims

---

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please report it via:

- **Email**: security@example.com (replace with actual contact)
- **GitHub Issues**: [Create a private security advisory](https://github.com/Cre-eD/quiz/security/advisories/new)

**DO NOT** publicly disclose vulnerabilities until they are resolved.

---

## Security Checklist for Deployment

Before deploying to production, verify:

- [ ] All environment variables configured in `.env`
- [ ] Service account key downloaded and stored securely
- [ ] Admin custom claims set for all admin users
- [ ] Firestore security rules tested in emulator
- [ ] Firestore rules deployed to production
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] No secrets committed to git (check with `git log --all --source -S "serviceAccountKey"`)
- [ ] Firebase domain restrictions configured (Firebase Console → Authentication → Settings → Authorized domains)
- [ ] Firebase quota monitoring enabled

---

## Security Best Practices for Developers

### When Adding New Features

1. **Input Validation**: Validate all user input (client + server)
2. **Sanitization**: Sanitize before storage and display
3. **Authorization**: Update Firestore rules if adding new collections
4. **Least Privilege**: Grant minimum necessary permissions
5. **Security Review**: Review changes for potential vulnerabilities

### When Handling User Data

1. **Never trust client data**: Always validate on server (Firestore rules)
2. **Sanitize HTML**: Use `sanitizeHTML()` before rendering
3. **Validate types**: Check data types before operations
4. **Rate limit**: Add rate limiting for expensive operations
5. **Log suspicious activity**: Log failed auth attempts, unusual patterns

### When Using Third-Party Libraries

1. **Audit dependencies**: Run `npm audit` before adding new packages
2. **Review permissions**: Check what data packages can access
3. **Stay updated**: Keep dependencies up to date
4. **Minimize dependencies**: Only add truly necessary packages

---

## Additional Resources

- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/basics)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)

---

**Last Updated**: 2026-02-12
**Security Version**: 1.0
**Next Review**: 2026-03-12
