#!/bin/bash
# Decrypt a quiz file using SOPS

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <quiz-file.enc.json>"
    echo "Example: $0 quizzes/devops-quiz.enc.json"
    exit 1
fi

INPUT="$1"

if [ ! -f "$INPUT" ]; then
    echo "Error: File not found: $INPUT"
    exit 1
fi

if [[ "$INPUT" != *.enc.json ]]; then
    echo "Error: Expected .enc.json file"
    exit 1
fi

OUTPUT="${INPUT%.enc.json}.json"

echo "Decrypting: $INPUT -> $OUTPUT"
sops -d "$INPUT" > "$OUTPUT"
echo "Done! Decrypted file: $OUTPUT"
echo ""
echo "Remember: Don't commit the decrypted file!"
