# Copilot SaaS API Testing Guide

This guide provides instructions and examples for testing the Copilot SaaS integration endpoints in the development environment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [API Endpoints](#api-endpoints)
4. [Testing Examples](#testing-examples)
5. [Common Issues](#common-issues)

## Prerequisites

Before testing the Copilot API:

1. **Development environment is running:**
   ```bash
   npm run dev:local
   # or
   ./dev-start.sh
   ```

2. **Copilot is enabled in your `.env.development`:**
   ```bash
   COPILOT_ENABLED=true
   COPILOT_API_URL=https://api-dev.copilot.example.com
   COPILOT_API_KEY=your_dev_api_key
   ```

3. **You have a valid authentication token** (for authenticated endpoints)

## Environment Setup

### Development API URLs

- **Backend:** http://localhost:4000
- **Frontend:** http://localhost:3000
- **Copilot API Base:** http://localhost:4000/api/copilot

### Authentication

Most Copilot endpoints require authentication. First, obtain a JWT token:

```bash
# Login to get token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Save the returned token for use in subsequent requests:
```bash
export TOKEN="your_jwt_token_here"
```

## API Endpoints

### 1. Service Status

Check if Copilot service is enabled and configured.

**Endpoint:** `GET /api/copilot/status`

**Authentication:** Not required

**Example:**
```bash
curl http://localhost:4000/api/copilot/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "apiUrl": "https://api-dev.copilot.example.com",
    "hasApiKey": true
  }
}
```

### 2. Health Check

Check if the Copilot service is healthy and reachable.

**Endpoint:** `GET /api/copilot/health`

**Authentication:** Not required

**Example:**
```bash
curl http://localhost:4000/api/copilot/health
```

**Response:**
```json
{
  "success": true,
  "healthy": true
}
```

### 3. Code Completion

Get code completion suggestions from Copilot.

**Endpoint:** `POST /api/copilot/complete`

**Authentication:** Required

**Request Body:**
```json
{
  "prompt": "function calculateSum(a, b) {",
  "context": {
    "language": "javascript",
    "file": "utils.js"
  },
  "parameters": {
    "max_tokens": 150,
    "temperature": 0.7
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:4000/api/copilot/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "prompt": "function calculateSum(a, b) {",
    "context": {
      "language": "javascript"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "completion": "  return a + b;\n}",
    "tokens_used": 15,
    "model": "copilot-codex"
  },
  "metadata": {
    "latency_ms": 342,
    "tokens_used": 15,
    "model": "copilot-codex"
  }
}
```

### 4. Code Generation

Generate complete code snippets from a description.

**Endpoint:** `POST /api/copilot/generate`

**Authentication:** Required

**Request Body:**
```json
{
  "prompt": "Create a React component that displays a user profile with name, email, and avatar",
  "language": "typescript",
  "context": {
    "framework": "react",
    "style": "functional"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:4000/api/copilot/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "prompt": "Create a function to validate email addresses",
    "language": "javascript",
    "context": {
      "style": "modern"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "code": "function validateEmail(email) {\n  const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n  return regex.test(email);\n}",
    "language": "javascript",
    "tokens_used": 45,
    "model": "copilot-codex"
  },
  "metadata": {
    "latency_ms": 512,
    "tokens_used": 45,
    "model": "copilot-codex"
  }
}
```

### 5. Code Explanation

Get explanations for existing code.

**Endpoint:** `POST /api/copilot/explain`

**Authentication:** Required

**Request Body:**
```json
{
  "code": "const memoize = fn => {\n  const cache = new Map();\n  return (...args) => {\n    const key = JSON.stringify(args);\n    if (cache.has(key)) return cache.get(key);\n    const result = fn(...args);\n    cache.set(key, result);\n    return result;\n  };\n};",
  "language": "javascript"
}
```

**Example:**
```bash
curl -X POST http://localhost:4000/api/copilot/explain \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "code": "const result = arr.reduce((acc, val) => acc + val, 0);",
    "language": "javascript"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "explanation": "This code uses the reduce method to sum all values in an array. It starts with an initial value of 0 and adds each array element to the accumulator.",
    "complexity": "O(n)",
    "concepts": ["array methods", "reduce", "accumulator"]
  }
}
```

### 6. Code Suggestions

Get inline code suggestions based on cursor position.

**Endpoint:** `POST /api/copilot/suggestions`

**Authentication:** Required

**Request Body:**
```json
{
  "code": "function processData(data) {\n  if (!data) return null;\n  // cursor here\n}",
  "cursorPosition": 65,
  "language": "javascript"
}
```

**Example:**
```bash
curl -X POST http://localhost:4000/api/copilot/suggestions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "code": "const users = await fetch(\"/api/users\");\n",
    "cursorPosition": 45,
    "language": "javascript"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      "const data = await users.json();",
      "if (!users.ok) throw new Error('Failed to fetch');",
      "return users.json();"
    ],
    "primary_suggestion": "const data = await users.json();"
  }
}
```

## Testing Examples

### Complete Testing Flow

Here's a complete testing flow using curl:

```bash
# 1. Check if Copilot is available
echo "1. Checking Copilot status..."
curl http://localhost:4000/api/copilot/status
echo -e "\n"

# 2. Health check
echo "2. Performing health check..."
curl http://localhost:4000/api/copilot/health
echo -e "\n"

# 3. Login to get token
echo "3. Logging in..."
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r '.token')
echo "Token obtained"
echo -e "\n"

# 4. Test code completion
echo "4. Testing code completion..."
curl -X POST http://localhost:4000/api/copilot/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "prompt": "function fibonacci(n) {",
    "context": {"language": "javascript"}
  }'
echo -e "\n"

# 5. Test code generation
echo "5. Testing code generation..."
curl -X POST http://localhost:4000/api/copilot/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "prompt": "Create a binary search function",
    "language": "javascript"
  }'
echo -e "\n"

# 6. Test code explanation
echo "6. Testing code explanation..."
curl -X POST http://localhost:4000/api/copilot/explain \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "code": "const squared = arr.map(x => x * x);",
    "language": "javascript"
  }'
```

### Testing with Postman

1. **Import Collection:**
   - Create a new collection in Postman
   - Add the base URL: `http://localhost:4000`

2. **Set Up Environment:**
   - Create variables: `baseUrl`, `token`
   - Set `baseUrl` to `http://localhost:4000`

3. **Authentication:**
   - Create a login request to get the token
   - Store the token in the `token` variable

4. **Test Endpoints:**
   - Use `{{baseUrl}}/api/copilot/status` for status checks
   - Use `Authorization: Bearer {{token}}` for authenticated requests

### Testing with JavaScript/TypeScript

```typescript
// copilot-test.ts
import axios from 'axios';

const API_BASE = 'http://localhost:4000';
let authToken = '';

async function login() {
  const response = await axios.post(`${API_BASE}/api/auth/login`, {
    email: 'test@example.com',
    password: 'password123'
  });
  authToken = response.data.token;
  console.log('✅ Logged in successfully');
}

async function testCopilotStatus() {
  const response = await axios.get(`${API_BASE}/api/copilot/status`);
  console.log('Copilot Status:', response.data);
}

async function testCodeCompletion() {
  const response = await axios.post(
    `${API_BASE}/api/copilot/complete`,
    {
      prompt: 'function greet(name) {',
      context: { language: 'javascript' }
    },
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  console.log('Code Completion:', response.data);
}

async function runTests() {
  try {
    await testCopilotStatus();
    await login();
    await testCodeCompletion();
    console.log('✅ All tests passed');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTests();
```

## Common Issues

### Issue 1: "Copilot service is not enabled"

**Cause:** Copilot is disabled in configuration

**Solution:**
1. Check `.env.development` has `COPILOT_ENABLED=true`
2. Restart the backend server
3. Verify with `/api/copilot/status`

### Issue 2: "Authorization header missing"

**Cause:** Missing or invalid JWT token

**Solution:**
1. Ensure you're logged in and have a valid token
2. Include the token in the Authorization header:
   ```
   Authorization: Bearer YOUR_TOKEN_HERE
   ```

### Issue 3: "Connection timeout"

**Cause:** Copilot API endpoint is unreachable

**Solution:**
1. Check `COPILOT_API_URL` in configuration
2. Verify network connectivity
3. Check if the dev API endpoint is accessible
4. Review backend logs for error details

### Issue 4: "Invalid API key"

**Cause:** Missing or incorrect Copilot API key

**Solution:**
1. Set `COPILOT_API_KEY` in `.env.development`
2. Ensure you're using the correct dev API key
3. Restart the backend after updating

### Issue 5: Service returns 404

**Cause:** Routes not properly registered

**Solution:**
1. Check that Copilot routes are imported in `backend/src/index.ts`
2. Verify the route path is `/api/copilot/*`
3. Check backend startup logs for route registration

## Debug Mode

Enable verbose logging to troubleshoot issues:

```bash
# In .env.development
DEBUG=true
VERBOSE_LOGGING=true
LOG_LEVEL=debug
```

Then restart the backend and check the console output for detailed logs.

## Additional Resources

- [Development Setup Guide](./DEV_SETUP.md)
- [Main API Documentation](./API.md)
- [Backend Architecture](./ARCHITECTURE.md)

## Support

If you encounter issues not covered in this guide:

1. Check backend logs for error messages
2. Enable debug mode for verbose logging
3. Verify all environment variables are set correctly
4. Review the [Troubleshooting Guide](./TROUBLESHOOTING.md)

---

**Note:** These are development/testing endpoints. Production endpoints will have different URLs and authentication requirements.
