#!/bin/bash

echo "🔍 Build Validation"
echo "==================="
echo ""

ERRORS=0

# Check dist exists
if [ ! -d "dist" ]; then
  echo "❌ dist/ folder not found. Run 'npm run build' first."
  exit 1
fi

# Check index.html
if [ ! -f "dist/index.html" ]; then
  echo "❌ dist/index.html not found"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ index.html exists"
fi

# Check for CSS
CSS_COUNT=$(find dist -name "*.css" | wc -l)
if [ "$CSS_COUNT" -eq 0 ]; then
  echo "❌ No CSS files found"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ CSS files found ($CSS_COUNT)"
fi

# Check for JS bundles
JS_COUNT=$(find dist -name "*.js" | wc -l)
if [ "$JS_COUNT" -eq 0 ]; then
  echo "❌ No JS bundles found"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ JS bundles found ($JS_COUNT)"
fi

# Check for emulator config leaks
echo ""
echo "Checking for emulator configuration leaks..."

if grep -r "localhost:9099" dist/ 2>/dev/null; then
  echo "❌ ERROR: Found 'localhost:9099' (Auth Emulator) in bundle"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ No Auth Emulator config found"
fi

if grep -r "localhost:8080" dist/ 2>/dev/null; then
  echo "❌ ERROR: Found 'localhost:8080' (Firestore Emulator) in bundle"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ No Firestore Emulator config found"
fi

if grep -r "VITE_USE_FIREBASE_EMULATOR.*true" dist/ 2>/dev/null; then
  echo "❌ ERROR: Found 'VITE_USE_FIREBASE_EMULATOR=true' in bundle"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ No emulator flag found"
fi

# Check bundle size
echo ""
BUNDLE_SIZE=$(du -sh dist | cut -f1)
echo "📦 Bundle size: $BUNDLE_SIZE"

# Check for common mistakes
echo ""
echo "Checking for common issues..."

# Check if .env.local was accidentally included
if [ -f "dist/.env.local" ]; then
  echo "❌ ERROR: .env.local found in dist/ (should not be bundled)"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ No .env.local in dist/"
fi

# Summary
echo ""
echo "==================="
if [ $ERRORS -eq 0 ]; then
  echo "✅ Build validation passed!"
  echo ""
  echo "Next steps:"
  echo "  npm run preview       # Test locally"
  echo "  npm run deploy:prod   # Deploy to Firebase"
  exit 0
else
  echo "❌ Build validation failed with $ERRORS error(s)"
  echo ""
  echo "Please fix the errors above before deploying."
  exit 1
fi
