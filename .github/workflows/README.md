# GitHub Actions Workflows

Automated CI/CD pipelines for Mind Map MCP

## Workflows

### ci.yml - Continuous Integration
Runs on every push and pull request to main/develop branches

**Jobs:**
- **quality**: Type checking and linting
- **test**: Run test suite with coverage
- **build**: Verify successful build

**Triggers:**
- Push to main, develop, or claude/** branches
- Pull requests to main or develop

### release.yml - Automated Releases
Publishes new versions to npm when tags are created

**Jobs:**
- **release**: Build, validate, and publish to npm

**Triggers:**
- Push of version tags (v*)

## Local Validation

Before pushing, run locally:
```bash
npm run validate
```

This runs: type-check + lint + test

## Status Badges

Add to README.md:
```markdown
![CI Status](https://github.com/nerfels/mind-map/workflows/CI/badge.svg)
```
