# Contributing to Algo Cloud IDE

Thank you for your interest in contributing to Algo Cloud IDE! This document provides guidelines for contributing to the project.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (OS, browser, versions)

### Suggesting Features

1. Check if the feature has been suggested
2. Create a new issue with:
   - Clear use case
   - Proposed solution
   - Any alternatives considered
   - Mockups or examples if applicable

### Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/Algodons/algo.git
   cd algo
   git remote add upstream https://github.com/Algodons/algo.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clear, commented code
   - Follow the coding standards
   - Add tests if applicable
   - Update documentation

4. **Test your changes**
   ```bash
   # Frontend
   cd frontend && npm test
   
   # Backend
   cd backend && npm test
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```
   
   Use conventional commits:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `style:` for formatting
   - `refactor:` for refactoring
   - `test:` for tests
   - `chore:` for maintenance

6. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   
   Then create a Pull Request on GitHub with:
   - Clear title and description
   - Reference to related issues
   - Screenshots if UI changes
   - Testing steps

## Development Setup

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Git

### Local Setup
```bash
# Clone repository
git clone https://github.com/Algodons/algo.git
cd algo

# Install dependencies
npm install
cd frontend && npm install
cd ../backend && npm install

# Start services
docker-compose up -d

# Start development servers
npm run dev
```

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for type safety
- Follow ESLint configuration
- Use meaningful variable names
- Add JSDoc comments for functions
- Keep functions small and focused

```typescript
// Good
const calculateTotal = (items: CartItem[]): number => {
  return items.reduce((sum, item) => sum + item.price, 0);
};

// Bad
const calc = (x: any) => {
  let t = 0;
  for (let i = 0; i < x.length; i++) {
    t += x[i].price;
  }
  return t;
};
```

### React Components

- Use functional components with hooks
- Keep components small and reusable
- Use TypeScript for props
- Follow naming conventions

```typescript
// Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ label, onClick, variant = 'primary' }) => {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {label}
    </button>
  );
};
```

### CSS/Styling

- Use Tailwind CSS utilities
- Follow mobile-first approach
- Use semantic class names
- Maintain consistent spacing

### Git Workflow

1. Keep commits atomic and focused
2. Write clear commit messages
3. Rebase before pushing to keep history clean
4. Don't commit sensitive data or credentials
5. Update your branch with main regularly

```bash
git fetch upstream
git rebase upstream/main
```

## Testing

### Frontend Tests
```bash
cd frontend
npm test
npm run test:coverage
```

### Backend Tests
```bash
cd backend
npm test
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## Documentation

- Update README.md for user-facing changes
- Update ARCHITECTURE.md for architectural changes
- Add JSDoc comments for functions
- Update API documentation for endpoint changes
- Include examples in documentation

## Review Process

1. Automated checks must pass (linting, tests, build)
2. At least one maintainer review required
3. Address review comments
4. Maintainer will merge when approved

## Security

- Report security vulnerabilities privately
- Don't include credentials in code
- Follow security best practices
- Run security checks before submitting

## Performance

- Optimize images and assets
- Minimize bundle size
- Use lazy loading where appropriate
- Profile performance-critical code
- Add performance tests for critical paths

## Accessibility

- Follow WCAG 2.1 guidelines
- Test with screen readers
- Ensure keyboard navigation
- Provide alt text for images
- Use semantic HTML

## Questions?

- Check existing documentation
- Search closed issues
- Ask in discussions
- Contact maintainers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project README

Thank you for contributing to Algo Cloud IDE! 🎉
