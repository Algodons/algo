# Post-Merge Checklist

After merging this PR, follow these steps to activate the automated PR review and approval system:

## Immediate Actions (Required)

### 1. Configure Branch Protection Rules
- [ ] Go to Repository Settings → Branches
- [ ] Add rule for `main` branch
- [ ] Enable "Require a pull request before merging" (1 approval)
- [ ] Enable "Require status checks to pass before merging"
- [ ] Add required status check: `CI Success`
- [ ] Add required status check: `Analyze Code`
- [ ] Enable "Require conversation resolution before merging"
- [ ] Enable "Include administrators"
- [ ] Save changes

📘 **Detailed instructions:** See `.github/BRANCH_PROTECTION.md`

### 2. Enable GitHub Actions
- [ ] Go to Repository Settings → Actions → General
- [ ] Ensure "Allow all actions and reusable workflows" is selected
- [ ] Save if needed

### 3. Create Required Labels
Run these commands (requires `gh` CLI):
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

Or create manually in Settings → Labels

## Configuration (Recommended)

### 4. Update CODEOWNERS
- [ ] Edit `.github/CODEOWNERS`
- [ ] Replace `@Algodons/maintainers` with your actual team name or usernames
- [ ] Update other team references (frontend-team, backend-team, etc.)
- [ ] Commit and push changes

Example:
```
*       @yourusername @maintainer1 @maintainer2
/src/   @frontend-dev1 @frontend-dev2
```

### 5. Configure Trusted Contributors (Optional)
If you want to enable auto-approval:
- [ ] Edit `.github/workflows/auto-approve.yml`
- [ ] Replace placeholder usernames in `TRUSTED_USERS` array
- [ ] Commit and push changes

⚠️ **Warning:** Only add highly trusted maintainers. Human review is still recommended.

### 6. Set Up Project Structure (If Not Already Done)
- [ ] Create `src/` directory for frontend code
- [ ] Create `server/` directory for backend code
- [ ] Create test directories (`src/__tests__`, `server/__tests__`)
- [ ] Add actual source files

### 7. Install Dependencies
```bash
npm install
```

## Optional Enhancements

### 8. Add Codecov Token (Optional)
For coverage reporting:
- [ ] Sign up at https://codecov.io
- [ ] Add repository
- [ ] Copy token
- [ ] Add as repository secret: Settings → Secrets → Actions → New secret
- [ ] Name: `CODECOV_TOKEN`
- [ ] Value: [your token]

### 9. Enable Dependabot (Optional but Recommended)
- [ ] Go to Settings → Security & analysis
- [ ] Enable "Dependabot alerts"
- [ ] Enable "Dependabot security updates"
- [ ] (Optional) Add `.github/dependabot.yml` for version updates

### 10. Configure Security Alerts
- [ ] Go to Settings → Security & analysis
- [ ] Enable "Code scanning" (if not already enabled by CodeQL workflow)
- [ ] Enable "Secret scanning"
- [ ] Configure notification preferences

## Verification

### 11. Test the Setup
- [ ] Create a test branch: `git checkout -b test/ci-setup`
- [ ] Make a small change (e.g., add a comment to README)
- [ ] Commit and push: `git push origin test/ci-setup`
- [ ] Open a PR on GitHub
- [ ] Verify workflows run automatically
- [ ] Check that labels are applied automatically
- [ ] Verify status checks appear
- [ ] Check for any errors in Actions tab

### 12. Verify Status Checks
After first PR:
- [ ] Go to Settings → Branches → Edit rule for `main`
- [ ] Verify `CI Success` appears in status check list
- [ ] Verify `Analyze Code` appears in status check list
- [ ] Select both as required
- [ ] Save changes

## Troubleshooting

### If workflows don't run:
1. Check that GitHub Actions is enabled
2. Verify workflow files are in `.github/workflows/`
3. Check Actions tab for any errors
4. Ensure YAML syntax is valid

### If status checks don't appear:
1. Workflows must run at least once to appear
2. Create a test PR to trigger workflows
3. Wait for workflows to complete
4. Then add to branch protection

### If auto-approval doesn't work:
1. Verify user is in `TRUSTED_USERS` list
2. Check that all CI checks passed
3. Ensure no security vulnerabilities were found
4. Review workflow logs in Actions tab

### If builds fail:
1. Ensure actual source code exists in `src/` and `server/`
2. Verify all npm scripts are properly configured
3. Check that dependencies are installed
4. Run builds locally first: `npm run build`

## Getting Help

- **Quick Start:** See `QUICK_SETUP.md`
- **CI/CD Details:** See `.github/CI_CD_DOCUMENTATION.md`
- **Branch Protection:** See `.github/BRANCH_PROTECTION.md`
- **Implementation:** See `IMPLEMENTATION_SUMMARY.md`

## Summary

Once you complete steps 1-3 (branch protection, actions, labels), the automated system will:
- ✅ Lint all PR code
- ✅ Build frontend and backend
- ✅ Run tests (when added)
- ✅ Scan for security vulnerabilities
- ✅ Add inline code review comments
- ✅ Label PRs automatically
- ✅ Send notifications
- ✅ (Optional) Auto-approve trusted contributor PRs

**Estimated setup time:** 10-15 minutes for required steps

---

**🎉 Congratulations! Your automated PR review and approval system is ready to use!**
