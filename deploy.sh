#!/bin/bash

# Exit immediately if any command exits with a non-zero status
set -e

echo "🚀 Starting local incremental optimization and sync..."

# 1. Run the image synchronization and optimization script
echo "⚡ Synchronizing assets via optimize.js..."
npm run optimize

# 2. Stage updates including configuration files, lock-files, and source mutations
echo "📦 Staging synchronization changes to Git index..."
git add -A public/images/ src/data/projects.json package-lock.json

# 3. Create a descriptive commit with a timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
COMMIT_MSG="chore: sync portfolio assets and lockfiles - ${TIMESTAMP}"

echo "💾 Committing synchronization status with message: '${COMMIT_MSG}'..."
git commit -m "${COMMIT_MSG}"

# 4. Push source data to GitHub to trigger GitHub Actions build pipeline
echo "📤 Pushing updates to GitHub..."
CURRENT_BRANCH=$(git branch --show-current)
git push origin "$CURRENT_BRANCH"

echo "✨ Success! Synchronization complete. Remote build will now update GitHub Pages."
