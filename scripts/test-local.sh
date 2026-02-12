#!/bin/bash
set -e

echo "🧪 Comprehensive Local Testing"
echo "================================"
echo ""

# 1. Unit Tests
echo "📋 Step 1/4: Running unit tests..."
npm test -- --run
echo "✅ Unit tests passed"
echo ""

# 2. Build Production Bundle
echo "🔨 Step 2/4: Building production bundle..."
# Temporarily move .env.local to use production env vars
if [ -f .env.local ]; then
  mv .env.local .env.local.backup
fi

npm run build

# Restore .env.local
if [ -f .env.local.backup ]; then
  mv .env.local.backup .env.local
fi
echo "✅ Production build successful"
echo ""

# 3. Validate Build Output
echo "🔍 Step 3/4: Validating build output..."

# Check if dist folder exists
if [ ! -d "dist" ]; then
  echo "❌ Error: dist folder not found"
  exit 1
fi

# Check if index.html exists
if [ ! -f "dist/index.html" ]; then
  echo "❌ Error: dist/index.html not found"
  exit 1
fi

# Check bundle size
BUNDLE_SIZE=$(du -sh dist | cut -f1)
echo "   Bundle size: $BUNDLE_SIZE"

# Check for common issues in bundle
if grep -r "localhost:9099" dist/ 2>/dev/null; then
  echo "❌ Error: Found localhost:9099 in production bundle (emulator config leak)"
  exit 1
fi

if grep -r "localhost:8080" dist/ 2>/dev/null; then
  echo "❌ Error: Found localhost:8080 in production bundle (emulator config leak)"
  exit 1
fi

echo "✅ Build validation passed"
echo ""

# 4. Start Local Preview Server
echo "🌐 Step 4/4: Starting preview server..."
echo ""
echo "================================================"
echo "Preview server will start on http://localhost:4173"
echo "Please test the following:"
echo "  1. Sign in with Google (admin access)"
echo "  2. Navigate to Dashboard"
echo "  3. Create/edit a quiz"
echo "  4. Launch a session"
echo "  5. Join as a player (use incognito/different browser)"
echo ""
echo "Press Ctrl+C when done testing"
echo "================================================"
echo ""

npm run preview
