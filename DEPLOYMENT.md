# Deployment Guide

## Production Deployment

### Important: Environment Configuration

The project uses environment files:
- `.env.production` - Production configuration (local only, never committed)
- `.env.local` - Local development configuration (connects to Firebase Emulator)

**Issue**: Vite prioritizes `.env.local` over `.env.production` during builds, which can cause production builds to mistakenly connect to localhost emulators.

### Recommended Deployment Method

Create local production env first:

```bash
cp .env.production.example .env.production
# fill in real values locally
```

Use the dedicated production deployment script:

```bash
npm run deploy:prod
```

This script automatically:
1. Temporarily moves `.env.local` out of the way
2. Builds with production configuration (`.env.production`)
3. Deploys to Firebase
4. Restores `.env.local` for local development

### Manual Deployment (Alternative)

If you prefer manual control:

```bash
# 1. Temporarily rename .env.local
mv .env.local .env.local.backup

# 2. Build and deploy
npm run build
firebase deploy

# 3. Restore .env.local for local development
mv .env.local.backup .env.local
```

### Regular Deployment (Local Development)

For deploying with current environment (useful for testing):

```bash
npm run deploy
```

⚠️ **Warning**: This uses whichever `.env*` file has precedence. Make sure you know which environment you're deploying!

---

## Firebase Configuration

### Environment Variables

**.env.production (Production - local only)**
```bash
VITE_FIREBASE_API_KEY=<production-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<project-id>
VITE_FIREBASE_APP_ID=<app-id>
VITE_ADMIN_EMAIL=<admin-email>
VITE_ENVIRONMENT=production
```

**.env.local (Local Development)**
```bash
VITE_FIREBASE_API_KEY=demo-project
VITE_FIREBASE_AUTH_DOMAIN=localhost
VITE_FIREBASE_PROJECT_ID=demo-project
VITE_FIREBASE_APP_ID=demo-app
VITE_ADMIN_EMAIL=admin@localhost
VITE_ENVIRONMENT=development
VITE_USE_FIREBASE_EMULATOR=true
```

### Firebase Emulator

To run locally with emulator:

```bash
# Terminal 1: Start emulators
firebase emulators:start

# Terminal 2: Start dev server
npm run dev
```

---

## Post-Deployment Checklist

After deploying to production:

- [ ] Verify app loads at https://devops-quiz-2c930.web.app
- [ ] Verify Firebase connection (no localhost errors)
- [ ] Test authentication with Google Sign-In
- [ ] Verify admin access (if custom claim is set)
- [ ] Test creating a quiz session
- [ ] Test joining a session as a player

---

## Setting Admin Custom Claims

After first deployment, set admin privileges:

```bash
# Download service account key from Firebase Console
# Project Settings → Service Accounts → Generate New Private Key
# Save as serviceAccountKey.json in project root

# Run admin claim script
node scripts/set-admin-claim.js your-email@example.com

# Sign out and sign in again to activate admin access
```

---

## Troubleshooting

### "Network request to discover nearby devices"

**Cause**: Production build is trying to connect to Firebase Emulator (localhost)

**Fix**: Rebuild with production config:
```bash
npm run deploy:prod
```

### Admin features not working

**Cause**: Custom claim not set or user hasn't re-authenticated

**Fix**:
1. Run `node scripts/set-admin-claim.js your-email@example.com`
2. Sign out and sign in again

### Firestore rules blocking access

**Cause**: Rules require custom claims for admin operations

**Fix**: Ensure custom claim is set (see above)

---

## Deployment Commands Reference

| Command | Description |
|---------|-------------|
| `npm run deploy:prod` | **Recommended**: Deploy to production (ignores .env.local) |
| `npm run deploy` | Deploy with current environment |
| `npm run build` | Build for production |
| `firebase deploy` | Deploy to Firebase (hosting + rules) |
| `firebase deploy --only hosting` | Deploy only hosting |
| `firebase deploy --only firestore:rules` | Deploy only Firestore rules |

---

**Last Updated**: 2026-02-13
