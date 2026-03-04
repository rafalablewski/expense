#!/bin/bash
set -e

REPO="https://github.com/rafalablewski/expense.git"
DIR="expense"

echo "🔄 Cloning rafalablewski/expense..."
git clone "$REPO" "$DIR"
cd "$DIR"

echo "📁 Copying project files..."

# Root files
cp ../package.json .
cp ../vite.config.js .
cp ../index.html .
cp ../.gitignore .
cp ../README.md .

# src/
mkdir -p src
cp ../src/main.jsx src/
cp ../src/App.jsx src/

# public/
mkdir -p public
cp ../public/favicon.svg public/

echo "📦 Staging files..."
git add -A

echo "✅ Committing..."
git commit -m "MaszkaApp — AI expense tracker

- Receipt scanning with Claude Vision API
- Manual expense entry (one-time + recurring)
- 29 categories, budgets, statistics
- Store analysis, price inflation tracker
- Spending prediction (linear regression)
- AI meal planner, CSV export
- Dark mode, multi-currency (PLN/EUR/USD)"

echo "🚀 Pushing to GitHub..."
git push origin main

echo ""
echo "✨ Done! Repo updated: https://github.com/rafalablewski/expense"
echo ""
echo "To run locally:"
echo "  cd $DIR && npm install && npm run dev"
