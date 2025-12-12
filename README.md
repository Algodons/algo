# algo

[![CI](https://github.com/Algodons/algo/actions/workflows/ci.yml/badge.svg)](https://github.com/Algodons/algo/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Algodons/algo/actions/workflows/codeql.yml/badge.svg)](https://github.com/Algodons/algo/actions/workflows/codeql.yml)

A cloud IDE with automated CI/CD, code quality checks, and security scanning.

## Features

- 🚀 Automated CI/CD with GitHub Actions
- 🔒 CodeQL security scanning
- ✅ Automated code reviews with ESLint
- 🤖 Conditional auto-approval for trusted contributors
- 📊 Bundle size monitoring
- 🔐 Dependency vulnerability scanning
- 📝 Automated PR labeling and notifications

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/Algodons/algo.git
cd algo

# Install dependencies
npm install

# Start development server
npm run dev
```

## Development Workflow

### Making Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make your changes and ensure code quality:
   ```bash
   npm run lint        # Check for linting errors
   npm run format      # Format code with Prettier
   npm run type-check  # Check TypeScript types
   npm run test        # Run tests
   ```

3. Commit and push:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin feature/my-feature
   ```

4. Open a Pull Request on GitHub

### Pull Request Process

When you open a PR, the following automated checks will run:

- **Linting**: ESLint checks code quality
- **Formatting**: Prettier verifies code formatting
- **Type Checking**: TypeScript compiler checks for type errors
- **Building**: Both frontend and backend are built
- **Testing**: Test suite is executed
- **Security Scanning**: CodeQL scans for vulnerabilities
- **Code Review**: Automated ESLint comments on changed lines
- **Dependency Review**: Checks for vulnerable dependencies
- **Bundle Size**: Monitors bundle size changes

All checks must pass before merging. See [CI/CD Documentation](.github/CI_CD_DOCUMENTATION.md) for details.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build frontend for production
- `npm run build:server` - Build backend server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report

## CI/CD Workflows

This repository uses GitHub Actions for automated workflows:

- **CI** ([ci.yml](.github/workflows/ci.yml)) - Linting, building, and testing
- **CodeQL** ([codeql.yml](.github/workflows/codeql.yml)) - Security vulnerability scanning
- **Code Review** ([code-review.yml](.github/workflows/code-review.yml)) - Automated code reviews
- **Auto-Approve** ([auto-approve.yml](.github/workflows/auto-approve.yml)) - Conditional PR auto-approval
- **Notifications** ([pr-notifications.yml](.github/workflows/pr-notifications.yml)) - PR notifications and labeling

See [CI/CD Documentation](.github/CI_CD_DOCUMENTATION.md) for detailed information.

## Branch Protection

The `main` and `develop` branches are protected and require:

- All CI checks to pass
- At least one approval from a code owner
- All conversations to be resolved
- Branch to be up to date with the target branch

See [Branch Protection Guide](.github/BRANCH_PROTECTION.md) for configuration details.

## Security

- CodeQL security scanning runs on all PRs and weekly on the main branch
- Dependency vulnerability scanning via Dependabot and GitHub Actions
- Auto-approval only for trusted contributors with passing security checks
- Signed commits recommended

Report security vulnerabilities via GitHub Security Advisories.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure all tests pass and code is formatted
5. Submit a pull request

Please follow the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE/pull_request_template.md) when creating PRs.

## Code Owners

Code reviews are automatically requested from appropriate teams based on the [CODEOWNERS](.github/CODEOWNERS) file.

## License

[License information to be added]

## Documentation

- [CI/CD Documentation](.github/CI_CD_DOCUMENTATION.md) - Detailed CI/CD setup and usage
- [Branch Protection Guide](.github/BRANCH_PROTECTION.md) - How to configure branch protection rules
- [Pull Request Template](.github/PULL_REQUEST_TEMPLATE/pull_request_template.md) - PR template for consistency