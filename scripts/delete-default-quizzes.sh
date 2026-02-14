#!/bin/bash
# Delete old quizzes from "default" course (L1-L14)

FIREBASE_TOKEN=$(gcloud auth print-access-token 2>/dev/null)
PROJECT_ID="devops-quiz-2c930"

if [ -z "$FIREBASE_TOKEN" ]; then
  echo "Error: Could not get Firebase auth token"
  echo "Run: firebase login"
  exit 1
fi

echo "🗑️  Deleting default course quizzes..."

for level in {1..14}; do
  for cat in pre mid post; do
    quiz_id="lec${level}-${cat}"
    echo "  Deleting: $quiz_id"
    curl -X DELETE \
      -H "Authorization: Bearer $FIREBASE_TOKEN" \
      "https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default)/documents/quizzes/$quiz_id" \
      > /dev/null 2>&1
  done
done

echo "✅ Done! Deleted old default course quizzes"
