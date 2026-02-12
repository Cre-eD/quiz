#!/bin/bash
set -e

echo "🚀 Production Deployment with Testing"
echo "======================================"
echo ""

# 1. Run unit tests
echo "📋 Step 1/5: Running unit tests..."
npm test -- --run
echo "✅ Unit tests passed"
echo ""

# 2. Build and validate
echo "🔨 Step 2/5: Building production bundle..."
if [ -f .env.local ]; then
  mv .env.local .env.local.backup
fi

npm run build

if [ -f .env.local.backup ]; then
  mv .env.local.backup .env.local
fi
echo "✅ Build successful"
echo ""

# 3. Validate build
echo "🔍 Step 3/5: Validating build..."
if grep -r "localhost:9099" dist/ 2>/dev/null || grep -r "localhost:8080" dist/ 2>/dev/null; then
  echo "❌ Error: Emulator config found in production bundle"
  exit 1
fi
echo "✅ Build validation passed"
echo ""

# 4. Local preview test
echo "🌐 Step 4/5: Starting local preview for manual testing..."
echo ""
echo "================================================"
echo "Preview: http://localhost:4173"
echo ""
echo "Please test:"
echo "  ✓ Sign in with Google"
echo "  ✓ Dashboard loads"
echo "  ✓ Create/edit quiz"
echo "  ✓ No console errors"
echo ""
echo "Type 'yes' and press Enter when ready to deploy"
echo "Type 'no' to cancel"
echo "================================================"
echo ""

# Start preview in background
npm run preview &
PREVIEW_PID=$!

# Wait for user confirmation
read -p "Continue with deployment? (yes/no): " CONFIRM

# Kill preview server
kill $PREVIEW_PID 2>/dev/null || true

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Deployment cancelled"
  exit 1
fi

# 5. Deploy to Firebase
echo ""
echo "☁️  Step 5/5: Deploying to Firebase..."
firebase deploy --only hosting

echo ""
echo "✅ Deployment complete!"
echo "🌐 Live at: https://devops-quiz-2c930.web.app"
