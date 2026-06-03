#!/bin/bash
set -euo pipefail

DEFAULT_TEST_URL="https://devops-quiz-2c930.web.app"
TEST_TARGET_URL="${TEST_URL:-$DEFAULT_TEST_URL}"

echo "🚀 Safe Deploy Pipeline"
echo "======================="
echo ""

echo "1/6 Unit tests"
npm test -- --run
echo "✅ Unit tests passed"
echo ""

echo "2/6 Local deterministic E2E (emulators)"
npm run test:e2e:local
echo "✅ Local E2E passed"
echo ""

echo "3/6 Production build"
npm run build
echo "✅ Build complete"
echo ""

echo "4/6 Build validation"
bash scripts/validate-build.sh
echo ""

echo "5/6 Deploy hosting"
firebase deploy --only hosting
echo "✅ Deploy complete"
echo ""

echo "6/6 Post-deploy public smoke (${TEST_TARGET_URL})"
TEST_URL="${TEST_TARGET_URL}" npm run test:e2e:prod-smoke
echo ""
echo "✅ Safe deploy pipeline passed"
