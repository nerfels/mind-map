# GitHub Automated Release Setup Guide 🚀

This guide will help you set up automated npm publishing through GitHub Actions.

## 📋 Prerequisites

1. **npm account** - You need an npm account with publish permissions
2. **GitHub repository** - Your code must be in a GitHub repository
3. **NPM_TOKEN** - Authentication token from npm

## 🔑 Step 1: Get Your NPM Token

1. Login to npm in your terminal:
```bash
npm login
```

2. Create an automation token:
```bash
npm token create --read-only=false
```

Or via npm website:
- Go to https://www.npmjs.com/
- Click on your profile → Access Tokens
- Click "Generate New Token" → "Classic Token"
- Select "Automation" type
- Copy the token (starts with `npm_...`)

## 🔐 Step 2: Add NPM Token to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Name: `NPM_TOKEN`
5. Value: Paste your npm token
6. Click **"Add secret"**

## 📝 Step 3: Workflow Files

We have three workflow files ready:

### 1. **`.github/workflows/release.yml`** (Already exists)
Triggered by git tags (e.g., `v1.12.0`)

### 2. **`.github/workflows/publish.yml`** (Created)
Manual trigger or on GitHub release creation

### 3. **`.github/workflows/auto-release.yml`** (New)
Automatic release when package.json version changes

## 🚀 How to Use

### Method 1: Tag-based Release (Recommended)
```bash
# Update version in package.json
npm version patch  # or minor/major

# Push with tags
git push && git push --tags

# GitHub Actions will automatically:
# - Run tests
# - Build project
# - Publish to npm
# - Create GitHub release
```

### Method 2: Manual Trigger
1. Go to GitHub repository
2. Click **Actions** tab
3. Select **"Publish to npm"** workflow
4. Click **"Run workflow"**
5. Enter version number
6. Click **"Run workflow"**

### Method 3: Auto-release on Push
Simply push changes with updated package.json version:
```bash
# Update version manually in package.json
# Commit and push
git add package.json
git commit -m "Release v1.12.1"
git push

# GitHub Actions detects version change and publishes
```

## 🎯 Complete Release Process

Here's the recommended workflow for releases:

```bash
# 1. Update version
npm version patch  # Updates package.json and creates git tag

# 2. Update documentation
# Edit README.md, TASKS.md with release notes

# 3. Commit changes
git add -A
git commit -m "Release v$(node -p "require('./package.json').version"): Description"

# 4. Push everything
git push origin master --follow-tags

# GitHub Actions handles the rest!
```

## 🔄 Workflow Features

### Automated Steps:
- ✅ Version validation
- ✅ Security audit
- ✅ Test suite execution
- ✅ Project build
- ✅ npm publishing
- ✅ GitHub release creation
- ✅ Release artifacts generation
- ✅ SHA256 checksums
- ✅ Post-release verification

### Safety Features:
- 🛡️ Tests must pass before release
- 🛡️ Security audit blocks high vulnerabilities
- 🛡️ Version mismatch prevention
- 🛡️ Automatic rollback on failure

## 📊 Monitoring Releases

1. **GitHub Actions Tab**: Watch workflow progress
2. **NPM Package Page**: https://www.npmjs.com/package/mind-map-mcp
3. **GitHub Releases**: https://github.com/nerfels/mind-map/releases

## 🐛 Troubleshooting

### NPM Token Issues
- Ensure token has publish permissions
- Check token hasn't expired
- Verify secret name is exactly `NPM_TOKEN`

### Version Conflicts
- Ensure package.json version matches tag
- Don't publish same version twice
- Use `npm version` command for consistency

### Failed Tests
- Run `npm test` locally first
- Check timeout settings in workflow
- Review test logs in GitHub Actions

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/)

## 🎉 You're All Set!

Your repository now has automated release capabilities. Every time you create a new version tag or manually trigger the workflow, your package will be automatically published to npm with a corresponding GitHub release!