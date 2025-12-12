# CI/CD Workflows Documentation

This document describes the automated workflows configured for the Algodons/algo repository to ensure code quality, security, and streamlined deployment.

## Overview

The repository uses GitHub Actions to automate:
- Code linting and formatting checks
- Building frontend and backend applications
- Running tests
- Security vulnerability scanning
- Automated code reviews
- Pull request notifications and labeling
- Conditional auto-approval for trusted contributors

## Workflows

### 1. CI Workflow (`ci.yml`)

**Triggers:**
- Pull requests to `main` and `develop` branches
- Pushes to `main` and `develop` branches

**Jobs:**

#### Lint Code
- Runs ESLint to check for code quality issues
- Runs Prettier to verify code formatting
- **Required:** Must pass for PR to be merged

#### Build Frontend
- Builds the Vite/React application
- Uploads build artifacts for later use
- Verifies the frontend can be built successfully

#### Build Backend
- Builds the Express server
- Uploads build artifacts
- Ensures backend code compiles without errors

#### Run Tests
- Executes the test suite
- Uploads coverage reports to Codecov (if configured)
- Validates all tests pass

#### TypeScript Type Check
- Runs TypeScript compiler in check mode
- Catches type errors without building

#### CI Success
- Final check that all jobs completed successfully
- **This is the primary status check for branch protection**

**Expected Scripts in package.json:**
```json
{
  "scripts": {
    "lint": "eslint src/ server/ --ext .js,.jsx,.ts,.tsx",
    "format:check": "prettier --check 'src/**/*.{ts,tsx,js,jsx}' 'server/**/*.{ts,js}'",
    "build": "vite build",
    "build:server": "tsc -p server/tsconfig.json",
    "test": "vitest run"
  }
}
```

### 2. CodeQL Security Scan (`codeql.yml`)

**Triggers:**
- Pull requests to `main` and `develop`
- Pushes to `main` and `develop`
- Scheduled weekly scans (Mondays at 6:00 AM UTC)

**Purpose:**
- Identifies security vulnerabilities in JavaScript/TypeScript code
- Scans for common security issues (SQL injection, XSS, etc.)
- Runs queries from GitHub's security-and-quality query suite

**Results:**
- Findings appear in the Security tab under Code scanning alerts
- Failed scans will block PR merging if critical issues are found

### 3. Automated Code Review (`code-review.yml`)

**Triggers:**
- Pull requests opened, synchronized, or reopened

**Jobs:**

#### ESLint Code Review
- Uses reviewdog to add inline comments on ESLint issues
- Only comments on lines that were added in the PR
- Provides actionable feedback directly in the PR

#### Dependency Review
- Checks for vulnerable dependencies
- Analyzes added/updated dependencies
- Posts summary in PR comments
- Fails on moderate or higher severity vulnerabilities

#### Bundle Size Check
- Monitors bundle size changes
- Comments on PRs if bundle size increases significantly
- Helps prevent performance regressions

### 4. Auto-Approve Workflow (`auto-approve.yml`)

**Triggers:**
- Pull requests opened, synchronized, or reopened
- Only runs for non-draft PRs

**Behavior:**
1. Checks if PR author is in the trusted contributors list
2. Waits for all CI checks to pass
3. Waits for CodeQL scan to complete
4. Checks for security vulnerabilities
5. Auto-approves if all conditions are met
6. Adds a comment noting auto-approval

**Security Safeguards:**
- Only trusted users can receive auto-approval
- All CI checks must pass
- CodeQL scan must complete without critical findings
- Skips auto-approval if security issues are detected

**Configuring Trusted Contributors:**
Edit the `TRUSTED_USERS` array in `.github/workflows/auto-approve.yml`:
```yaml
TRUSTED_USERS=(
  "owner-username"
  "maintainer-username"
)
```

### 5. PR Notifications (`pr-notifications.yml`)

**Triggers:**
- PR opened, reopened, or marked ready for review
- Review submitted
- Review requested

**Features:**

#### Notify Reviewers
- Posts comment when PR is ready for review
- Notifies when reviews are submitted
- Helps keep team informed

#### Auto-Label
Automatically adds labels based on:
- **File types:** `frontend`, `backend`, `tests`, `documentation`, `configuration`, `ci/cd`
- **Size:** `size/xs`, `size/s`, `size/m`, `size/l`, `size/xl`

Label thresholds:
- XS: < 10 lines changed
- S: 10-49 lines changed
- M: 50-199 lines changed
- L: 200-499 lines changed
- XL: 500+ lines changed

## Setup Instructions

### 1. Repository Configuration

#### Required Dependencies
Ensure your `package.json` includes development dependencies for:
```json
{
  "devDependencies": {
    "eslint": "^8.x",
    "prettier": "^3.x",
    "@typescript-eslint/parser": "^6.x",
    "@typescript-eslint/eslint-plugin": "^6.x",
    "eslint-config-prettier": "^9.x",
    "eslint-plugin-react": "^7.x",
    "eslint-plugin-react-hooks": "^4.x",
    "eslint-plugin-jsx-a11y": "^6.x",
    "eslint-plugin-import": "^2.x"
  }
}
```

#### Required Scripts
Add these scripts to `package.json`:
```json
{
  "scripts": {
    "lint": "eslint src/ server/ --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint src/ server/ --ext .js,.jsx,.ts,.tsx --fix",
    "format": "prettier --write 'src/**/*.{ts,tsx,js,jsx}' 'server/**/*.{ts,js}'",
    "format:check": "prettier --check 'src/**/*.{ts,tsx,js,jsx}' 'server/**/*.{ts,js}'",
    "type-check": "tsc --noEmit",
    "build": "vite build",
    "build:server": "tsc -p server/tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 2. Branch Protection Rules

Follow the instructions in [BRANCH_PROTECTION.md](.github/BRANCH_PROTECTION.md) to configure:
- Required status checks
- Required approvals
- Conversation resolution
- Other protection settings

### 3. Repository Secrets (Optional)

Configure in Settings → Secrets and variables → Actions:
- `CODECOV_TOKEN` - For code coverage reporting

### 4. Create Required Labels

Create the following labels in your repository (Settings → Labels):

**Type Labels:**
- `frontend` - 🎨 Frontend changes
- `backend` - ⚙️ Backend changes
- `tests` - ✅ Test updates
- `documentation` - 📝 Documentation
- `configuration` - 🔧 Configuration changes
- `ci/cd` - 🚀 CI/CD changes

**Size Labels:**
- `size/xs` - Extra small changes
- `size/s` - Small changes
- `size/m` - Medium changes
- `size/l` - Large changes
- `size/xl` - Extra large changes

### 5. Update CODEOWNERS

Edit `.github/CODEOWNERS` to match your team structure:
```
*       @Algodons/maintainers
/src/   @Algodons/frontend-team
/server/ @Algodons/backend-team
```

## Using the Workflows

### For Contributors

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "Add new feature"
   ```

3. **Push and create PR**
   ```bash
   git push origin feature/my-feature
   ```
   Then create a PR on GitHub

4. **Wait for CI checks**
   - All workflows will run automatically
   - Fix any issues reported by linting, tests, or security scans
   - Push fixes to the same branch

5. **Request review**
   - Use PR template to describe changes
   - Request review from appropriate team members
   - Wait for approval

6. **Merge**
   - Once approved and all checks pass, merge the PR
   - Delete the feature branch after merging

### For Reviewers

1. **Check automated feedback**
   - Review ESLint comments
   - Check dependency review results
   - Verify bundle size impact

2. **Review code changes**
   - Look for logic errors
   - Verify test coverage
   - Check for security issues

3. **Approve or request changes**
   - Use GitHub's review feature
   - Provide constructive feedback

## Monitoring and Maintenance

### Viewing Workflow Runs
- Navigate to the **Actions** tab in GitHub
- Select a workflow to view run history
- Click on a run to see detailed logs

### Common Issues

#### Workflow fails on missing scripts
**Solution:** Add the required scripts to `package.json`

#### ESLint errors
**Solution:** Run `npm run lint:fix` locally and commit fixes

#### Build failures
**Solution:** Run `npm run build` locally to reproduce and fix

#### Type errors
**Solution:** Run `npm run type-check` locally and fix type issues

#### Security vulnerabilities
**Solution:** Review CodeQL alerts in Security tab and address findings

### Debugging Workflows

1. Check the Actions tab for detailed logs
2. Run commands locally to reproduce issues:
   ```bash
   npm ci
   npm run lint
   npm run build
   npm run test
   ```
3. Review workflow YAML files for configuration issues

## Performance Considerations

### Workflow Optimization
- Jobs run in parallel where possible
- Uses caching for Node.js dependencies
- Uploads artifacts for use in subsequent workflows

### Cost Management
- Workflows only run on PR and push events
- CodeQL runs weekly to minimize compute usage
- Artifacts retained for 7 days

## Security Best Practices

1. **Never commit secrets** - Use GitHub Secrets for sensitive data
2. **Review dependency updates** - Check for vulnerabilities before merging
3. **Monitor CodeQL alerts** - Address security findings promptly
4. **Limit auto-approval** - Only trust verified contributors
5. **Require signed commits** - Enable in branch protection for authenticity

## Continuous Improvement

### Metrics to Track
- Average time from PR creation to merge
- Number of failed CI runs
- Security vulnerabilities detected and fixed
- Test coverage trends

### Regular Reviews
- **Monthly:** Review workflow efficiency
- **Quarterly:** Update dependencies and actions versions
- **Annually:** Audit security settings and permissions

## Support

For issues or questions about CI/CD workflows:
1. Check workflow logs in the Actions tab
2. Review this documentation
3. Open an issue in the repository
4. Contact the DevOps team

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Configuration](https://prettier.io/docs/en/configuration.html)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Vite Build Configuration](https://vitejs.dev/config/)
