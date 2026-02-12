# Admin Setup Guide

## Issue: Organization Policy Restriction

Your organization has restricted service account key creation, which prevents downloading the `serviceAccountKey.json` needed for the `set-admin-claim.js` script.

## Immediate Solution: Email-Based Admin Check

Since custom claims require service account access, we'll use a **temporary email-based admin check** that works immediately.

### Step 1: Update Firestore Rules (Temporary)

Replace the custom claims check with email-based check:

```javascript
// firestore.rules - TEMPORARY SOLUTION
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Temporary: Email-based admin check (until custom claims are set)
    function isAdmin() {
      return request.auth != null &&
             request.auth.token.email == "creeed22@gmail.com";
    }

    // ... rest of the rules stay the same
  }
}
```

### Step 2: Deploy Updated Rules

```bash
firebase deploy --only firestore:rules
```

### Step 3: Test Admin Access

1. Go to https://devops-quiz-2c930.web.app
2. Sign in with creeed22@gmail.com
3. You should now have admin access

---

## Future: Setting Custom Claims (More Secure)

When you have access to set custom claims, use one of these methods:

### Method 1: Cloud Functions (Recommended)

Create a one-time Cloud Function to set admin claims:

```bash
# Initialize Cloud Functions
firebase init functions

# Deploy admin claim setter function
# (Function code provided in functions/index.js)
firebase deploy --only functions:setAdminClaim
```

### Method 2: Firebase Console with Extensions

1. Install the "Set User Custom Claims" extension from Firebase Extensions marketplace
2. Configure it to set `admin: true` for your email
3. Extension handles the admin SDK authentication

### Method 3: Request Organization Admin

If you have a Firebase organization admin, they can:
1. Temporarily grant you service account key creation permissions
2. You download the key and run `node scripts/set-admin-claim.js`
3. They revoke the permission after setup

### Method 4: Local Admin SDK Setup (Advanced)

If you have Google Cloud SDK installed with project permissions:

```bash
# Authenticate with gcloud
gcloud auth application-default login

# Set environment variable
export GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/application_default_credentials.json

# Run the admin script
node scripts/set-admin-claim.js creeed22@gmail.com
```

---

## Security Comparison

| Method | Security Level | Setup Complexity | Recommended |
|--------|---------------|------------------|-------------|
| Email-based | ⚠️ Medium | ⭐ Easy | Temporary only |
| Custom Claims | ✅ High | ⭐⭐ Moderate | Yes (production) |
| Service Account | ✅ High | ⭐⭐⭐ Complex | If available |

### Why Custom Claims Are Better

**Email-based (current temporary solution):**
- ❌ Email can be changed by user
- ❌ Hardcoded in rules (less flexible)
- ✅ Works immediately without additional setup

**Custom Claims (recommended for production):**
- ✅ Server-side verified (cannot be spoofed)
- ✅ Cannot be changed by user
- ✅ More flexible (can add roles, permissions)
- ✅ Industry standard

---

## Current Status

✅ **Application is functional** with email-based admin check
⚠️ **Upgrade to custom claims** when organization policy allows

---

## Quick Reference

**Current admin email**: creeed22@gmail.com
**Firestore rules location**: `/home/creed/creed/quiz/firestore.rules`
**Deploy rules**: `firebase deploy --only firestore:rules`

**To add more admins** (temporary method):
```javascript
function isAdmin() {
  return request.auth != null &&
         (request.auth.token.email == "creeed22@gmail.com" ||
          request.auth.token.email == "another-admin@example.com");
}
```

---

**Last Updated**: 2026-02-13
