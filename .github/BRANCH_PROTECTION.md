# GitHub Branch Protection Setup Guide

This document provides instructions for configuring branch protection rules to ensure code quality and security in the Algodons/algo repository.

## Prerequisites

- Repository admin access
- GitHub Actions workflows already configured (see `.github/workflows/`)

## Branch Protection Rules Configuration

### Step 1: Access Branch Protection Settings

1. Navigate to your repository on GitHub
2. Click on **Settings** → **Branches**
3. Under "Branch protection rules", click **Add rule** or edit existing rule

### Step 2: Configure Protection for `main` Branch

#### Branch Name Pattern
```
main
```

#### Required Settings

**1. Require a pull request before merging**
- ✅ Enable this option
- **Required approvals:** 1 (recommended minimum)
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require review from Code Owners (if CODEOWNERS file is configured)
- ⚠️ Optional: Require approval of the most recent reviewable push

**2. Require status checks to pass before merging**
- ✅ Enable this option
- ✅ Require branches to be up to date before merging
- **Required status checks:**
  - `CI Success` - Main CI workflow completion check
  - `Lint Code` - ESLint and Prettier checks
  - `Build Frontend` - Frontend build verification
  - `Build Backend` - Backend build verification
  - `Run Tests` - Test suite execution
  - `TypeScript Type Check` - Type checking
  - `Analyze Code` - CodeQL security scan
  - `ESLint Code Review` - Automated code review
  - `Dependency Review` - Dependency vulnerability scan

**3. Require conversation resolution before merging**
- ✅ Enable this option (recommended)
- Ensures all review comments are addressed

**4. Require signed commits**
- ⚠️ Optional but recommended for security
- Helps verify commit authenticity

**5. Require linear history**
- ⚠️ Optional (prevents merge commits)
- Use if you prefer rebase/squash workflow

**6. Include administrators**
- ✅ Enable this option (highly recommended)
- Applies rules to repository administrators as well

**7. Restrict who can push to matching branches**
- ⚠️ Optional
- Configure if you want to limit who can push directly
- Even with this disabled, PR requirements still apply

**8. Allow force pushes**
- ❌ Disable this option (recommended)
- Prevents history rewriting

**9. Allow deletions**
- ❌ Disable this option (recommended)
- Prevents accidental branch deletion

### Step 3: Configure Protection for `develop` Branch (if applicable)

Repeat Step 2 with the following adjustments:

#### Branch Name Pattern
```
develop
```

#### Recommended Differences
- **Required approvals:** Can be reduced to 1 or even 0 for faster iteration
- **Require branches to be up to date:** Can be disabled for faster merges
- More relaxed settings appropriate for development branch

## Rulesets (New GitHub Feature)

As an alternative to traditional branch protection rules, GitHub now offers Rulesets which provide more flexibility:

### Creating a Ruleset

1. Navigate to **Settings** → **Rules** → **Rulesets**
2. Click **New ruleset** → **New branch ruleset**
3. Configure the following:

#### Basic Settings
- **Ruleset Name:** "Production Branch Protection"
- **Enforcement status:** Active
- **Bypass list:** (empty or specific admin users)

#### Target Branches
- **Add target:** `Include by pattern`
- **Pattern:** `main`

#### Rules
Select the following rules:
- ✅ Restrict deletions
- ✅ Require a pull request before merging
  - Required approvals: 1
- ✅ Require status checks to pass
  - Add all CI workflow checks
- ✅ Block force pushes
- ✅ Require code scanning results

## Auto-Approval Configuration

The repository includes an auto-approval workflow (`.github/workflows/auto-approve.yml`) that can automatically approve PRs from trusted contributors.

### Configuring Trusted Contributors

Edit `.github/workflows/auto-approve.yml` and update the `TRUSTED_USERS` array:

```yaml
TRUSTED_USERS=(
  "owner-username"
  "maintainer-username"
  "trusted-contributor"
)
```

### Required Permissions

For auto-approval to work, you need to:

1. Create a GitHub App or use a Personal Access Token (PAT)
2. Add the token as a repository secret named `GITHUB_TOKEN` (automatically available) or create a custom secret
3. Grant the following permissions:
   - `pull-requests: write`
   - `contents: read`

### Security Considerations

⚠️ **Important Security Notes:**

1. **Auto-approval is NOT a replacement for human review** - it's a convenience feature for trusted contributors
2. The workflow still requires:
   - All CI checks to pass
   - No security vulnerabilities detected
   - Clean CodeQL scan
3. Even with auto-approval, we recommend having at least one human reviewer verify changes before merging
4. Consider using auto-approval only for:
   - Minor documentation updates
   - Dependency updates (after automated testing)
   - Trusted maintainer changes

## Required Repository Secrets

Configure the following secrets in **Settings** → **Secrets and variables** → **Actions**:

### Optional Secrets
- `CODECOV_TOKEN` - For code coverage reporting (if using Codecov)
- Custom GitHub token if using auto-approval with enhanced permissions

## Notifications Setup

The repository includes a notification workflow (`.github/workflows/pr-notifications.yml`) that:
- Notifies reviewers when PRs are opened
- Updates on review status changes
- Auto-labels PRs based on changed files
- Categorizes PRs by size

No additional configuration is needed for basic functionality.

## Testing Your Configuration

After setting up branch protection:

1. Create a test branch
2. Make a small change
3. Open a PR to `main`
4. Verify that:
   - All required checks run
   - You cannot merge until checks pass
   - You cannot merge without required approvals
   - Status checks appear in the PR

## Troubleshooting

### Status checks not appearing
- Ensure workflows have run at least once
- Check that workflow names match exactly
- Verify workflows are on the default branch

### Cannot merge even with passing checks
- Verify all required status checks are selected
- Check that branch is up to date
- Ensure all conversations are resolved

### Auto-approval not working
- Check workflow logs in Actions tab
- Verify user is in trusted list
- Ensure all CI checks passed
- Check GitHub token permissions

## Additional Resources

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Rulesets Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [CODEOWNERS Documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)

## Maintenance

Review and update these settings:
- **Quarterly:** Review branch protection rules
- **After major changes:** Update required status checks
- **When adding team members:** Update CODEOWNERS and trusted contributors list
- **After security incidents:** Review and tighten security settings
