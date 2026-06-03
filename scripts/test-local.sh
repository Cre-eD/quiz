#!/bin/bash
set -euo pipefail

echo "🧪 Local Test Pipeline"
echo "======================"
echo ""

echo "1/4 Unit tests"
npm test -- --run
echo "✅ Unit tests passed"
echo ""

echo "2/4 Production build"
npm run build
echo "✅ Build complete"
echo ""

echo "3/4 Build validation"
bash scripts/validate-build.sh
echo ""

echo "4/4 Local deterministic E2E (emulators)"
npm run test:e2e:local
echo ""
echo "✅ Local pipeline passed"
