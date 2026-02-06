#!/bin/bash
# Setup script for GitHub Secrets needed for automatic migrations
# Run this script to configure your repository for CI/CD

set -e

echo "========================================"
echo "Multi-Clip-Sync GitHub Secrets Setup"
echo "========================================"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI (gh) is not installed."
    echo "Install it from: https://cli.github.com/"
    echo ""
    echo "Or manually add these secrets in GitHub:"
    echo "  Repository → Settings → Secrets and variables → Actions"
    echo ""
    echo "Required secrets:"
    echo "  - SUPABASE_PROJECT_ID: dtkfcnlxkshrflujtsaj"
    echo "  - SUPABASE_ACCESS_TOKEN: (from https://supabase.com/dashboard/account/tokens)"
    echo "  - SUPABASE_DB_PASSWORD: (from Project Settings → Database)"
    echo "  - VITE_SUPABASE_URL: https://dtkfcnlxkshrflujtsaj.supabase.co"
    echo "  - VITE_SUPABASE_PUBLISHABLE_KEY: (your anon key)"
    exit 1
fi

# Check if logged in to GitHub
if ! gh auth status &> /dev/null; then
    echo "Please login to GitHub CLI first:"
    echo "  gh auth login"
    exit 1
fi

# Get repository info
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
if [ -z "$REPO" ]; then
    echo "Could not detect repository. Please run from within a git repository."
    exit 1
fi

echo "Setting up secrets for repository: $REPO"
echo ""

# Set known values
echo "Setting SUPABASE_PROJECT_ID..."
gh secret set SUPABASE_PROJECT_ID -b "dtkfcnlxkshrflujtsaj" --repo "$REPO"

echo "Setting VITE_SUPABASE_URL..."
gh secret set VITE_SUPABASE_URL -b "https://dtkfcnlxkshrflujtsaj.supabase.co" --repo "$REPO"

# Prompt for values that need to be entered
echo ""
echo "Please enter your Supabase Access Token"
echo "(Get it from: https://supabase.com/dashboard/account/tokens)"
read -sp "SUPABASE_ACCESS_TOKEN: " ACCESS_TOKEN
echo ""
if [ -n "$ACCESS_TOKEN" ]; then
    gh secret set SUPABASE_ACCESS_TOKEN -b "$ACCESS_TOKEN" --repo "$REPO"
    echo "✓ SUPABASE_ACCESS_TOKEN set"
fi

echo ""
echo "Please enter your Supabase Database Password"
echo "(Get it from: Project Settings → Database → Database password)"
read -sp "SUPABASE_DB_PASSWORD: " DB_PASSWORD
echo ""
if [ -n "$DB_PASSWORD" ]; then
    gh secret set SUPABASE_DB_PASSWORD -b "$DB_PASSWORD" --repo "$REPO"
    echo "✓ SUPABASE_DB_PASSWORD set"
fi

echo ""
echo "Please enter your Supabase Anon Key (publishable key)"
read -sp "VITE_SUPABASE_PUBLISHABLE_KEY: " ANON_KEY
echo ""
if [ -n "$ANON_KEY" ]; then
    gh secret set VITE_SUPABASE_PUBLISHABLE_KEY -b "$ANON_KEY" --repo "$REPO"
    echo "✓ VITE_SUPABASE_PUBLISHABLE_KEY set"
fi

echo ""
echo "========================================"
echo "Setup complete!"
echo "========================================"
echo ""
echo "GitHub Actions will now automatically:"
echo "  1. Run database migrations on push to main/master"
echo "  2. Build the application"
echo ""
echo "Push your changes to trigger the workflow:"
echo "  git push origin main"
echo ""
