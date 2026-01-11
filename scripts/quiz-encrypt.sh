#!/bin/bash
# Encrypt a quiz file using SOPS

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <quiz-file.json>"
    echo "Example: $0 quizzes/devops-quiz.json"
    exit 1
fi

INPUT="$1"
OUTPUT="${INPUT%.json}.enc.json"

if [ ! -f "$INPUT" ]; then
    echo "Error: File not found: $INPUT"
    exit 1
fi

if [[ "$INPUT" == *.enc.json ]]; then
    echo "Error: File is already encrypted"
    exit 1
fi

echo "Encrypting: $INPUT -> $OUTPUT"
sops -e --output "$OUTPUT" "$INPUT"
echo "Done! Encrypted file: $OUTPUT"
echo ""
echo "You can now safely delete the unencrypted file:"
echo "  rm $INPUT"
