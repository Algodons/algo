# Express API Template

A production-ready Express REST API with TypeScript.

## Features

- 🚀 **Express** - Fast, minimalist web framework
- 📘 **TypeScript** - Type safety
- 🔐 **JWT Authentication** - Secure endpoints
- ✅ **Validation** - Request validation with express-validator
- 🔧 **Environment Config** - dotenv configuration
- 📝 **Logging** - Structured logging
- 🐳 **Docker Ready** - Production-ready Dockerfile

## Tech Stack

- Express 4+
- TypeScript 5+
- JWT for authentication
- express-validator
- CORS enabled
- dotenv for configuration

## Project Structure

```
my-api/
├── src/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── models/
│   ├── utils/
│   └── index.ts
├── package.json
├── tsconfig.json
└── .env
```

## Getting Started

```bash
npm install
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests

## API Endpoints

### Health Check
```
GET /health
```

### Authentication
```
POST /api/auth/login
POST /api/auth/register
```

## Customization Options

When initializing this template, you can enable:
- Database integration (PostgreSQL, MongoDB)
- Authentication middleware
- Rate limiting
- API documentation (Swagger)
- Testing setup (Jest, Supertest)
- Docker and docker-compose

## Default Port

3000

## Environment Variables

Create a `.env` file:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/mydb
JWT_SECRET=your-secret-key
```

## Database Integration

### PostgreSQL
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

### MongoDB
```typescript
import mongoose from 'mongoose';

mongoose.connect(process.env.MONGODB_URI);
```

## Authentication

JWT-based authentication is included:

```typescript
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { userId: user.id }, 
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
```

## Deployment

### Docker

```bash
docker build -t my-api .
docker run -p 3000:3000 --env-file .env my-api
```

### Docker Compose

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://db:5432/mydb
    depends_on:
      - db
  
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=mydb
      - POSTGRES_PASSWORD=password
```

## Security Best Practices

- Use environment variables for secrets
- Enable CORS with specific origins
- Implement rate limiting
- Use helmet for security headers
- Validate all inputs
- Use HTTPS in production

## Learn More

- [Express Documentation](https://expressjs.com)
- [TypeScript Documentation](https://www.typescriptlang.org)
- [JWT.io](https://jwt.io)
