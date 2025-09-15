---
allowed-tools: Bash(npm:*), Bash(git:*)
argument-hint: [patch|minor|major]
description: Quick release without extensive checks - for minor updates
---

# ⚡ Quick Release

Fast release workflow for minor updates (skips some validation steps).

## Usage

```bash
/quick-release patch    # Quick patch release
/quick-release minor    # Quick minor release
```

## Steps

### 1. Update and Commit
!`npm version $1 && NEW_VERSION=$(node -p "require('./package.json').version") && git add . && git commit -m "Release v$NEW_VERSION: Quick $1 release 🤖 Generated with [Claude Code](https://claude.ai/code)" && git push origin $(git branch --show-current)`

### 2. Build and Publish
!`npm run build && npm publish`

### 3. Tag Release
!`NEW_VERSION=$(node -p "require('./package.json').version") && git tag "v$NEW_VERSION" && git push origin "v$NEW_VERSION"`

### 4. Success Message
!`NEW_VERSION=$(node -p "require('./package.json').version") && echo "⚡ Quick release v$NEW_VERSION completed!"`