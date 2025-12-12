# Contributing to Cloud IDE

Thank you for your interest in contributing to the Cloud IDE project! This document provides guidelines and instructions for contributing.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Pull Request Process](#pull-request-process)
6. [Project Structure](#project-structure)
7. [Testing](#testing)

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Respect differing viewpoints and experiences

## Getting Started

### Prerequisites

- Node.js 18+
- Git
- Basic understanding of TypeScript and React

### Setup Development Environment

1. Fork the repository
2. Clone your fork:
```bash
git clone https://github.com/YOUR_USERNAME/algo.git
cd algo
```

3. Add upstream remote:
```bash
git remote add upstream https://github.com/Algodons/algo.git
```

4. Install dependencies:
```bash
npm install
```

5. Start development server:
```bash
npm run dev
```

## Development Workflow

### Creating a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes
2. Test your changes thoroughly
3. Commit with clear messages:
```bash
git commit -m "feat: add new feature X"
```

### Staying Updated

```bash
git fetch upstream
git rebase upstream/main
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Properly type all functions and variables
- Avoid `any` types when possible

**Good:**
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // implementation
}
```

**Bad:**
```typescript
function getUser(id: any): any {
  // implementation
}
```

### React Components

- Use functional components with hooks
- Prefer named exports for components
- Keep components small and focused
- Separate logic from presentation

**Example:**
```typescript
import React, { useState, useEffect } from 'react';

interface Props {
  userId: string;
}

const UserProfile: React.FC<Props> = ({ userId }) => {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);
  
  if (!user) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
};

export default UserProfile;
```

### CSS Styling

- Use separate CSS files for components
- Follow BEM naming convention when appropriate
- Keep styles scoped to components
- Use CSS variables for theming

**Example:**
```css
.user-profile {
  padding: 16px;
}

.user-profile__header {
  font-size: 24px;
  font-weight: bold;
}

.user-profile__content {
  margin-top: 12px;
}
```

### Backend Code

- Use Express middleware pattern
- Handle errors properly
- Validate inputs
- Use async/await over callbacks

**Example:**
```typescript
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const user = await createUser({ name, email });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});
```

### Commit Messages

Follow conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

**Examples:**
```
feat: add collaborative cursor tracking
fix: resolve WebSocket reconnection issue
docs: update API documentation
refactor: simplify Git API error handling
```

## Pull Request Process

### Before Submitting

1. ✅ Test your changes locally
2. ✅ Update documentation if needed
3. ✅ Add tests for new features
4. ✅ Run linter: `npm run lint` (if available)
5. ✅ Build succeeds: `npm run build`

### PR Template

When creating a PR, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test these changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

### Review Process

1. Submit PR to `main` branch
2. Wait for automated checks
3. Address reviewer feedback
4. Maintainer will merge when approved

## Project Structure

```
algo/
├── server/           # Backend Node.js code
│   ├── index.ts     # Main server entry
│   ├── yjs-server.ts
│   ├── terminal-server.ts
│   ├── git-api.ts
│   ├── package-api.ts
│   ├── preview-server.ts
│   └── database-api.ts
├── src/             # Frontend React code
│   ├── components/  # React components
│   │   ├── Editor.tsx
│   │   ├── Terminal.tsx
│   │   ├── GitPanel.tsx
│   │   └── ...
│   ├── App.tsx
│   └── main.tsx
├── public/          # Static assets
├── dist/            # Build output
└── docs/            # Documentation
```

## Testing

### Running Tests

```bash
npm test
```

### Writing Tests

Use Jest for testing:

```typescript
import { render, screen } from '@testing-library/react';
import UserProfile from './UserProfile';

describe('UserProfile', () => {
  it('renders user name', () => {
    render(<UserProfile userId="123" />);
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
  });
});
```

## Areas for Contribution

### High Priority

- [ ] User authentication and authorization
- [ ] Workspace isolation and security
- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] Accessibility improvements

### Features

- [ ] Additional language support
- [ ] Plugin system
- [ ] Themes and customization
- [ ] AI-powered code completion
- [ ] Code search and navigation

### Documentation

- [ ] Video tutorials
- [ ] API examples
- [ ] Best practices guide
- [ ] Troubleshooting guide

### Testing

- [ ] Unit tests for components
- [ ] Integration tests for APIs
- [ ] E2E tests with Playwright/Cypress
- [ ] Performance benchmarks

## Getting Help

- 📖 Read the [README](README.md)
- 📋 Check [API Documentation](API.md)
- 🐛 Browse [Issues](https://github.com/Algodons/algo/issues)
- 💬 Ask questions in Discussions

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing! 🎉
