#!/bin/bash

# VibeCodingGame Deployment Script
# This script automates the deployment process to GitHub

set -e  # Exit on any error

echo "🚀 Starting deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_error "Not a git repository. Please run this script from your project root."
    exit 1
fi

# Check if there are any changes to commit
if [ -n "$(git status --porcelain)" ]; then
    print_status "Changes detected. Adding files to git..."
    
    # Add all files
    git add .
    
    # Get commit message from user or use default
    if [ -z "$1" ]; then
        COMMIT_MSG="Deploy: $(date '+%Y-%m-%d %H:%M:%S')"
        print_warning "No commit message provided. Using default: $COMMIT_MSG"
    else
        COMMIT_MSG="$1"
    fi
    
    # Commit changes
    print_status "Committing changes with message: $COMMIT_MSG"
    git commit -m "$COMMIT_MSG"
else
    print_status "No changes to commit."
fi

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
print_status "Current branch: $CURRENT_BRANCH"

# Push to GitHub
print_status "Pushing to GitHub repository..."
if git push origin "$CURRENT_BRANCH"; then
    print_status "✅ Successfully deployed to GitHub!"
    print_status "🌐 Repository: https://github.com/rommanali-spec/VibeCodingGame"
    
    # If on main branch and GitHub Pages is enabled, provide the pages URL
    if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
        print_status "📄 GitHub Pages (if enabled): https://rommanali-spec.github.io/VibeCodingGame"
    fi
else
    print_error "Failed to push to GitHub. Please check your connection and permissions."
    exit 1
fi

echo "🎉 Deployment completed successfully!"
