---
allowed-tools: Bash(npm:*), Bash(git:*), Bash(grep:*), Bash(sed:*), Edit, Read, Write
argument-hint: [version-type: patch|minor|major|x.y.z]
description: Publish Mind Map MCP - automated release workflow for this project
---

# 🧠 Mind Map MCP Release Workflow

Automated release workflow specifically for the Mind Map MCP project.

## Usage

```bash
/publish-mcp patch    # 1.3.0 → 1.3.1
/publish-mcp minor    # 1.3.0 → 1.4.0
/publish-mcp major    # 1.3.0 → 2.0.0
/publish-mcp 1.5.2    # Set specific version
```

## Pre-Release Checks

### 1. Check Git Status
!`echo "🔍 Checking git status..." && git status --porcelain`

### 2. Ensure Clean Working Directory
!`if [ -n "$(git status --porcelain)" ]; then echo "❌ Working directory not clean. Commit or stash changes first."; exit 1; else echo "✅ Working directory clean"; fi`

### 3. Ensure on Main Branch
!`CURRENT_BRANCH=$(git branch --show-current) && if [ "$CURRENT_BRANCH" != "master" ] && [ "$CURRENT_BRANCH" != "main" ]; then echo "❌ Not on main/master branch. Currently on: $CURRENT_BRANCH"; exit 1; else echo "✅ On main branch: $CURRENT_BRANCH"; fi`

## Release Process

### 4. Update Version in package.json
!`echo "📦 Updating version..." && npm version $1 --no-git-tag-version`

### 5. Get New Version Number
!`NEW_VERSION=$(node -p "require('./package.json').version") && echo "🔢 New version: v$NEW_VERSION"`

### 6. Update README.md Version References
!`NEW_VERSION=$(node -p "require('./package.json').version") && echo "📝 Updating README version references..." && sed -i.bak "s/mind-map-mcp@[0-9]\+\.[0-9]\+\.[0-9]\+/mind-map-mcp@$NEW_VERSION/g" README.md && sed -i.bak "s/v[0-9]\+\.[0-9]\+\.[0-9]\+/v$NEW_VERSION/g" README.md && rm -f README.md.bak`

### 7. Update PROJECT_PLAN.md if exists
!`NEW_VERSION=$(node -p "require('./package.json').version") && if [ -f "PROJECT_PLAN.md" ]; then echo "📋 Updating PROJECT_PLAN.md..." && sed -i.bak "s/v[0-9]\+\.[0-9]\+\.[0-9]\+/v$NEW_VERSION/g" PROJECT_PLAN.md && rm -f PROJECT_PLAN.md.bak; else echo "📋 No PROJECT_PLAN.md found, skipping..."; fi`

### 8. Build Project
!`echo "🔨 Building project..." && npm run build`

### 9. Run TypeScript Check
!`echo "📘 Running TypeScript check..." && npx tsc --noEmit`

### 10. Run Tests (if available)
!`if npm run test >/dev/null 2>&1; then echo "🧪 Running tests..." && npm run test; else echo "🧪 No tests found, skipping..."; fi`

### 11. Run Linting (if available)
!`if npm run lint >/dev/null 2>&1; then echo "🔍 Running linter..." && npm run lint; else echo "🔍 No linting found, skipping..."; fi`

## Git Operations

### 12. Stage All Changes
!`echo "📤 Staging changes..." && git add .`

### 13. Create Release Commit
!`NEW_VERSION=$(node -p "require('./package.json').version") && COMMIT_MSG="Release v$NEW_VERSION: $(echo '$1' | grep -q '^[0-9]' && echo 'Manual version update' || echo 'Version bump ($1)') $(if [ '$1' = 'major' ]; then echo '🚀 Major release with breaking changes'; elif [ '$1' = 'minor' ]; then echo '✨ Minor release with new features'; elif [ '$1' = 'patch' ]; then echo '🐛 Patch release with bug fixes'; else echo '📦 Custom version release'; fi) 🤖 Generated with [Claude Code](https://claude.ai/code) Co-Authored-By: Claude <noreply@anthropic.com>" && git commit -m "$COMMIT_MSG"`

### 14. Push to Repository
!`echo "🚀 Pushing to repository..." && git push origin $(git branch --show-current)`

### 15. Create and Push Git Tag
!`NEW_VERSION=$(node -p "require('./package.json').version") && echo "🏷️  Creating tag v$NEW_VERSION..." && git tag "v$NEW_VERSION" && git push origin "v$NEW_VERSION"`

## NPM Publishing

### 16. Publish to NPM
!`echo "📡 Publishing to NPM..." && npm publish`

## Success Summary

### 17. Display Success Information
!`NEW_VERSION=$(node -p "require('./package.json').version") && PACKAGE_NAME=$(node -p "require('./package.json').name") && echo "🎉 Successfully released Mind Map MCP v$NEW_VERSION! 📦 Package: $PACKAGE_NAME@$NEW_VERSION 🔗 NPM: https://www.npmjs.com/package/$PACKAGE_NAME 🏷️ Git Tag: v$NEW_VERSION 📂 Repository: $(git config --get remote.origin.url) 🔧 Installation: npm install $PACKAGE_NAME@$NEW_VERSION 🚀 Next steps: Update documentation, announce the release, monitor for issues"`