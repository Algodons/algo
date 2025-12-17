# Snyk Security Scanning Setup Guide

## Overview
This repository uses Snyk for comprehensive security scanning of dependencies, container images, and source code. The Snyk workflow has been configured but requires a secret token to function properly.

## Required Configuration

### Step 1: Obtain Your Snyk API Token
1. Go to [Snyk Account Settings](https://app.snyk.io/account)
2. Log in to your Snyk account (create one if you don't have it)
3. Navigate to **Settings** → **General** → **API Token**
4. Click **Show** to reveal your API token
5. Copy the token (it should start with a UUID format)

### Step 2: Add SNYK_TOKEN to GitHub Repository Secrets
1. Go to your GitHub repository: https://github.com/Algodons/algo
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Set the following:
   - **Name**: `SNYK_TOKEN`
   - **Secret**: Paste your Snyk API token from Step 1
5. Click **Add secret**

### Step 3: Verify the Configuration
After adding the secret, the Snyk workflow will be able to authenticate properly. You can verify by:

1. Pushing a commit to `main` or `develop` branch, or
2. Manually triggering the workflow from the Actions tab
3. Checking that the workflow runs successfully without authentication errors

## What This Enables

With the SNYK_TOKEN configured, the repository will have:

### 1. **Dependency Scanning**
- Automatically scans `package.json` and `package-lock.json` for vulnerable dependencies
- Runs on every push and pull request
- Results uploaded to GitHub Security tab

### 2. **Container Scanning**
- Scans Docker images for vulnerabilities
- Checks base images and installed packages
- Runs on pushes to main/develop branches

### 3. **Code Analysis**
- Static analysis of source code for security issues
- Identifies common vulnerabilities (XSS, SQL injection, etc.)
- Provides remediation advice

### 4. **Production Monitoring**
- Monitors production dependencies on main branch
- Tracks vulnerabilities over time in Snyk dashboard
- Sends alerts for newly discovered issues

## Workflow Schedule

The Snyk security scan runs:
- On every push to `main` and `develop` branches
- On every pull request to `main` and `develop` branches
- Daily at 2:00 AM UTC (scheduled scan)
- On manual workflow dispatch

## Viewing Results

### In GitHub
1. Go to the **Security** tab in your repository
2. Click **Code scanning alerts**
3. Filter by tool: "Snyk"

### In Snyk Dashboard
1. Log in to [Snyk Dashboard](https://app.snyk.io)
2. Select your organization
3. View "algo-cloud-ide" project
4. See detailed vulnerability reports and remediation advice

## Troubleshooting

### Authentication Errors (SNYK-0005)
**Error**: `Authentication credentials not recognized, or user access is not provisioned`

**Solutions**:
- Verify SNYK_TOKEN secret is correctly set in GitHub
- Ensure the token is valid and not expired
- Regenerate a new token from Snyk if needed
- Check that the token has proper permissions in Snyk

### Missing SARIF File
**Error**: `Path does not exist: snyk.sarif`

**Solutions**:
- This usually occurs when authentication fails
- Fix the SNYK_TOKEN first
- The SARIF file is now automatically generated with `--sarif-file-output=snyk.sarif`

### Incompatible CLI Flags
**Error**: `Invalid flag option (SNYK-CLI-0004)`

**Solutions**:
- This has been fixed in the workflow
- The monitor job now only uses `--all-projects` flag
- No action needed

## Support

For questions or issues:
1. Check the [Snyk Documentation](https://docs.snyk.io/)
2. Review workflow logs in GitHub Actions tab
3. Contact the DevOps team
4. Open an issue in the repository

## Security Note

⚠️ **Never commit the SNYK_TOKEN to version control!**  
Always use GitHub Secrets for storing sensitive tokens and credentials.
