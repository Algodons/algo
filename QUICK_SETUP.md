# Quick Setup Guide

This guide will help you quickly set up the automated PR review and approval system in the Algodons/algo repository.

## 1. Enable GitHub Actions

GitHub Actions should be enabled by default. Verify by going to:
- Repository → Settings → Actions → General
- Ensure "Allow all actions and reusable workflows" is selected

## 2. Configure Branch Protection Rules

Follow these steps to protect your main branch:

1. Go to **Settings** → **Branches**
2. Click **Add rule** (or edit existing rule for `main`)
3. Set branch name pattern: `main`
4. Enable these settings:
   - ✅ Require a pull request before merging
     - Required approvals: 1
   - ✅ Require status checks to pass before merging
     - Add these required checks:
       - `CI Success`
       - `Analyze Code`
   - ✅ Require conversation resolution before merging
   - ✅ Include administrators
5. Click **Create** or **Save changes**

See [BRANCH_PROTECTION.md](.github/BRANCH_PROTECTION.md) for detailed configuration.

## 3. Configure Trusted Contributors (Optional)

If you want to enable auto-approval for trusted contributors:

1. Edit `.github/workflows/auto-approve.yml`
2. Update the `TRUSTED_USERS` array with GitHub usernames:
   ```yaml
   TRUSTED_USERS=(
     "your-username"
     "trusted-maintainer"
   )
   ```
3. Commit and push the changes

⚠️ **Note:** Auto-approval should only be used for trusted maintainers and still requires human verification before merging.

## 4. Update CODEOWNERS (Optional but Recommended)

1. Edit `.github/CODEOWNERS`
2. Replace placeholder team names with your actual GitHub team names:
   ```
   *       @Algodons/maintainers
   /src/   @Algodons/frontend-team
   /server/ @Algodons/backend-team
   ```
3. Commit and push the changes

If you don't have teams set up:
- Remove the `@Algodons/` prefix
- Use individual usernames instead: `@username`

## 5. Create Required Labels

Create these labels in your repository (Settings → Labels):

**Type Labels:**
- `frontend` (color: #61dafb)
- `backend` (color: #68bc00)
- `tests` (color: #0e8a16)
- `documentation` (color: #0075ca)
- `configuration` (color: #fef2c0)
- `ci/cd` (color: #1d76db)

**Size Labels:**
- `size/xs` (color: #00ff00)
- `size/s` (color: #7fff00)
- `size/m` (color: #ffff00)
- `size/l` (color: #ff7f00)
- `size/xl` (color: #ff0000)

Or run this script to create them automatically:
```bash
gh label create frontend --color 61dafb
gh label create backend --color 68bc00
gh label create tests --color 0e8a16
gh label create documentation --color 0075ca
gh label create configuration --color fef2c0
gh label create "ci/cd" --color 1d76db
gh label create size/xs --color 00ff00
gh label create size/s --color 7fff00
gh label create size/m --color ffff00
gh label create size/l --color ff7f00
gh label create size/xl --color ff0000
```

## 6. Set Up Repository Structure

If you haven't already, create the basic project structure:

```bash
# Frontend
mkdir -p src/components
mkdir -p src/pages

# Backend
mkdir -p server

# Tests
mkdir -p src/__tests__
mkdir -p server/__tests__
```

## 7. Install Dependencies

Install the required npm packages:

```bash
npm install
```

This will install all dependencies defined in `package.json` including:
- ESLint and plugins
- Prettier
- TypeScript
- Vite
- React
- Testing libraries

## 8. Test the Setup Locally

Before creating a PR, test locally:

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Check formatting
npm run format:check

# Format code
npm run format

# Run type checking
npm run type-check

# Run tests (when you add them)
npm run test
```

## 9. Create Your First PR

1. Create a feature branch:
   ```bash
   git checkout -b test/ci-setup
   ```

2. Make a small change (e.g., add a comment)

3. Commit and push:
   ```bash
   git add .
   git commit -m "Test CI/CD setup"
   git push origin test/ci-setup
   ```

4. Open a PR on GitHub

5. Watch the workflows run automatically!

## 10. Verify Everything Works

Check that these workflows run on your PR:
- ✅ CI workflow (linting, building, testing)
- ✅ CodeQL security scan
- ✅ Automated code review
- ✅ PR labeling

## Troubleshooting

### Workflows not running
- Check that GitHub Actions is enabled
- Ensure workflows are in `.github/workflows/` directory
- Verify YAML syntax is correct

### Required status checks not appearing
- Workflows must run at least once before they can be required
- Create a test PR to trigger the workflows
- Then add them to branch protection

### Auto-approval not working
- Verify your username is in the trusted list
- Check that all CI checks passed
- Review workflow logs in the Actions tab

### Dependencies not installing
- Ensure you have Node.js 18+ installed
- Try deleting `node_modules` and running `npm ci`

## Next Steps

1. **Add actual tests**: The setup includes testing infrastructure, but you'll need to write tests
2. **Configure Codecov** (optional): Add `CODECOV_TOKEN` secret for coverage reports
3. **Set up Dependabot**: Enable automated dependency updates
4. **Configure security alerts**: Set up notifications for security issues
5. **Customize workflows**: Adjust the workflows to match your specific needs

## Additional Resources

- [Full CI/CD Documentation](.github/CI_CD_DOCUMENTATION.md)
- [Branch Protection Guide](.github/BRANCH_PROTECTION.md)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## Getting Help

If you encounter issues:
1. Check the workflow logs in the Actions tab
2. Review the documentation files
3. Open an issue in the repository
4. Contact the DevOps team

---

**Congratulations!** 🎉 Your repository now has a comprehensive automated PR review and approval system!
