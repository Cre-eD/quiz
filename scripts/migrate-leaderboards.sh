#!/bin/bash
# Migration script to add course and year fields to existing leaderboards
# Uses Firebase REST API

set -e

PROJECT_ID="devops-quiz-2c930"
API_URL="https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default)/documents"

echo "🔄 Starting leaderboard migration..."
echo ""

# Mapping of leaderboard names to course and year
declare -A MAPPINGS=(
  ["2ft58l62w"]="devops-intro-rus:2026"  # DevOps Intro Spring 2026 RUS 2
  ["4l2y4fvz6"]="devops-intro:2026"      # DevOps Intro Spring 2026 ENG 2
  ["9hxm3cdpd"]="devops:2026"            # DevOps Spring 2026 2
  ["9q3lzjw8n"]="devops-intro-rus:2026"  # DevOps Intro Spring 2026 RUS
  ["dr54we53w"]="devops-intro:2026"      # DevOps Intro Spring 2026 ENG
  ["itxspfv93"]="devsecops-intro:2026"   # DevSecOps Intro Spring 2026 2
  ["kcm6i6gs7"]="devops:2026"            # DevOps Spring 2026
  ["pfbppjp9z"]="devsecops-intro:2026"   # DevSecOps Intro Spring 2026
)

MIGRATED=0

for ID in "${!MAPPINGS[@]}"; do
  IFS=':' read -r COURSE YEAR <<< "${MAPPINGS[$ID]}"

  echo "Migrating leaderboard $ID -> course: $COURSE, year: $YEAR"

  # Update using PATCH
  curl -s -X PATCH \
    "$API_URL/leaderboards/$ID?updateMask.fieldPaths=course&updateMask.fieldPaths=year" \
    -H "Content-Type: application/json" \
    -d "{
      \"fields\": {
        \"course\": {\"stringValue\": \"$COURSE\"},
        \"year\": {\"integerValue\": \"$YEAR\"}
      }
    }" > /dev/null

  echo "✅ Migrated leaderboard $ID"
  ((MIGRATED++))
done

echo ""
echo "📊 Migration complete!"
echo "   Migrated: $MIGRATED leaderboards"
echo ""
echo "🔄 Please refresh the app to see the filters"
