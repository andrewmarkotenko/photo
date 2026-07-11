#!/bin/bash

# Exit immediately if any command exits with a non-zero status
set -e

echo "🚀 Starting local optimization and asset push..."

# 1. Run ONLY the image optimization script locally
echo "⚡ Running image optimization script..."
npm run optimize

# 2. Stage updated source assets and data registry, excluding build artifacts
echo "📦 Staging updated assets and data files..."
git add public/images/ src/data/projects.json

# 3. Create a descriptive commit with a timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
COMMIT_MSG="chore: optimize portfolio assets and update data - ${TIMESTAMP}"

echo "💾 Committing changes with message: '${COMMIT_MSG}'..."
git commit -m "${COMMIT_MSG}"

# 4. Push the source files to GitHub to trigger the remote CI/CD build
echo "📤 Pushing source changes to GitHub..."
CURRENT_BRANCH=$(git branch --show-current)
git push origin "$CURRENT_BRANCH"

echo "✨ Success! Source assets pushed. GitHub Actions will now handle the production build."
