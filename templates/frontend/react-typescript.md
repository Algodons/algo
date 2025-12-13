# React TypeScript Template

A modern React application with TypeScript and Vite.

## Features

- ⚡️ **Vite** - Lightning fast build tool
- 🎨 **TypeScript** - Type safety
- 🧩 **ESLint** - Code linting
- 💅 **Prettier** - Code formatting
- 🎯 **Modern React** - Hooks, Context, etc.

## Tech Stack

- React 18+
- TypeScript 5+
- Vite 5+
- ESLint & Prettier

## Project Structure

```
my-app/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── public/
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Getting Started

```bash
npm install
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Customization Options

When initializing this template, you can enable:
- Authentication (JWT, OAuth)
- State Management (Redux, Zustand)
- Routing (React Router)
- UI Framework (Material-UI, Tailwind CSS)
- Testing (Jest, React Testing Library)
- Docker support

## Default Port

5173 (Vite default)

## Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:4000
```

## Deployment

### Docker

A Dockerfile is generated automatically if requested:

```bash
docker build -t my-react-app .
docker run -p 5173:5173 my-react-app
```

### Kubernetes

Kubernetes manifests can be generated via the automation API.

## Learn More

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [TypeScript Documentation](https://www.typescriptlang.org)
