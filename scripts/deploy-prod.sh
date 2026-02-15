#!/bin/bash
# Production deployment script
# Ensures .env.local doesn't override production .env.production during build

set -e  # Exit on error

echo "🚀 Starting production deployment..."

# Step 1: Temporarily move .env.local
if [ -f .env.local ]; then
  echo "📦 Temporarily moving .env.local..."
  mv .env.local .env.local.temp
  RESTORED=false
else
  echo "ℹ️  No .env.local found, proceeding with .env.production"
  RESTORED=true
fi

# Step 2: Clean build directories
echo "🧹 Cleaning build cache..."
rm -rf dist node_modules/.vite

# Step 3: Build with production config
echo "🔨 Building with production configuration..."
npm run build

# Step 4: Deploy to Firebase
echo "☁️  Deploying to Firebase..."
firebase deploy --only hosting

# Step 5: Restore .env.local
if [ "$RESTORED" = false ]; then
  echo "♻️  Restoring .env.local..."
  mv .env.local.temp .env.local
fi

echo "✅ Production deployment complete!"
echo "🌐 Live at: https://devops-quiz-2c930.web.app"
