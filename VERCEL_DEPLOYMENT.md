# Vercel Deployment Guide

This guide will help you deploy the Algo Cloud IDE platform to Vercel for testing, staging, and production environments.

## 🏗️ Architecture Overview

This is a **monorepo** with two main components:
1. **Frontend** (Next.js 15) - Located in `/frontend` directory
2. **Backend** (Express.js) - Located in `/backend` directory

### Deployment Strategy

For Vercel deployment, we have two options:

**Option A: Frontend Only on Vercel (Recommended)**
- Deploy the Next.js frontend to Vercel
- Deploy the backend separately to a service that supports WebSockets and persistent connections (Railway, Render, Fly.io, AWS, etc.)
- This is recommended because the backend requires WebSocket support, terminal sessions (node-pty), and persistent connections which are not ideal for serverless

**Option B: Both on Vercel (Limited Features)**
- Deploy frontend to Vercel
- Deploy backend API routes as serverless functions
- ⚠️ Note: Some features like terminal sessions, WebSockets, and long-running processes won't work in serverless

This guide focuses on **Option A** as it provides the best user experience.

---

## 📋 Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository** - Your code should be in a Git repository
3. **Backend Deployment** - Have your backend deployed elsewhere (see Backend Deployment section)

---

## 🚀 Step 1: Backend Deployment

Deploy the backend to a platform that supports:
- WebSocket connections
- Long-running processes
- Terminal sessions (node-pty)

### Recommended Platforms:

#### Railway (Easiest)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and initialize
railway login
railway init

# Deploy backend
cd backend
railway up
```

Get your backend URL: `https://your-app.railway.app`

#### Render
1. Go to [render.com](https://render.com)
2. Create a new Web Service
3. Connect your repository
4. Set root directory to `backend`
5. Build command: `npm install && npm run build`
6. Start command: `npm start`

#### Fly.io
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login and launch
fly auth login
cd backend
fly launch
```

### Backend Environment Variables

Configure these on your backend platform:

```env
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://your-app.vercel.app

# Database URLs
POSTGRES_HOST=your-db-host
POSTGRES_PORT=5432
POSTGRES_DB=algo_ide
POSTGRES_USER=algo_user
POSTGRES_PASSWORD=your-password

REDIS_HOST=your-redis-host
REDIS_PORT=6379

MONGODB_URI=mongodb+srv://...
```

---

## 🌐 Step 2: Deploy Frontend to Vercel

### Method 1: Using Vercel Dashboard (Recommended for first-time setup)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"

2. **Import Your Repository**
   - Select your Git provider (GitHub, GitLab, or Bitbucket)
   - Choose the `Algodons/algo` repository
   - Click "Import"

3. **Configure Project Settings**

   **Framework Preset:** Next.js
   
   **Root Directory:** `frontend` (⚠️ Important!)
   
   **Build & Development Settings:**
   - Build Command: `npm run build`
   - Output Directory: `.next` (default)
   - Install Command: `npm install`
   
   **Node Version:** 18.x or higher

4. **Environment Variables**
   
   Add these environment variables (click "Environment Variables" tab):

   ```
   NEXTAUTH_URL=https://your-app-name.vercel.app
   NEXTAUTH_SECRET=your-generated-secret-32-chars
   JWT_SECRET=another-generated-secret-32-chars
   API_URL=https://your-backend.railway.app
   WEBSOCKET_URL=wss://your-backend.railway.app
   FRONTEND_URL=https://your-app-name.vercel.app
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   NEXT_PUBLIC_WEBSOCKET_URL=wss://your-backend.railway.app
   ```

   **Generate secure secrets:**
   ```bash
   # Use this command to generate random secrets
   openssl rand -base64 32
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for the build to complete
   - You'll get a URL like: `https://algo-xyz.vercel.app`

### Method 2: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Navigate to frontend directory
cd frontend

# Deploy (first time will ask configuration questions)
vercel

# For production deployment
vercel --prod
```

When prompted:
- Set up and deploy: `Y`
- Which scope: Choose your team/account
- Link to existing project: `N` (first time)
- What's your project's name: `algo-cloud-ide`
- In which directory is your code located: `./` (since you're already in frontend)
- Want to override settings: `N`

---

## 🔧 Step 3: Configure Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_URL` | Your Vercel app URL | `https://algo.vercel.app` |
| `NEXTAUTH_SECRET` | Random 32-char string | Generate with `openssl rand -base64 32` |
| `JWT_SECRET` | Random 32-char string | Generate with `openssl rand -base64 32` |
| `API_URL` | Backend API endpoint | `https://api.railway.app` |
| `WEBSOCKET_URL` | Backend WebSocket URL | `wss://api.railway.app` |
| `FRONTEND_URL` | Your Vercel app URL | `https://algo.vercel.app` |
| `NEXT_PUBLIC_API_URL` | Public API URL (client) | `https://api.railway.app` |
| `NEXT_PUBLIC_WEBSOCKET_URL` | Public WS URL (client) | `wss://api.railway.app` |

### Adding Variables in Vercel Dashboard

1. Go to your project settings: `https://vercel.com/[team]/[project]/settings/environment-variables`
2. Add each variable with:
   - **Key**: Variable name (e.g., `NEXTAUTH_SECRET`)
   - **Value**: Your value
   - **Environment**: Select Production, Preview, and Development as needed
3. Click "Save"

### Environment-Specific Variables

- **Production**: Used for `vercel --prod` deployments
- **Preview**: Used for pull request previews
- **Development**: Used for `vercel dev` local development

---

## ✅ Step 4: Verify Deployment

### 1. Check Build Logs

In Vercel dashboard:
- Go to your project
- Click on the deployment
- View the build logs for any errors

### 2. Test the Application

Visit your Vercel URL (e.g., `https://algo-xyz.vercel.app`)

**Test Checklist:**
- [ ] Homepage loads correctly
- [ ] UI renders properly
- [ ] Can connect to backend API
- [ ] Authentication works (if implemented)
- [ ] No console errors in browser DevTools

### 3. Test API Connectivity

Open browser console and test:
```javascript
fetch(process.env.NEXT_PUBLIC_API_URL + '/api/health')
  .then(r => r.json())
  .then(console.log)
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🔄 Step 5: Continuous Deployment

Vercel automatically deploys when you push to your repository:

- **Production**: Deploys from `main` or `master` branch
- **Preview**: Deploys from any other branch or pull request

### Configure Git Integration

1. In Vercel dashboard, go to Settings → Git
2. Set production branch to `main`
3. Enable automatic deployments for pull requests

---

## 🐛 Troubleshooting

### Build Fails with "Module not found"

**Solution:** Ensure all dependencies are in `frontend/package.json`
```bash
cd frontend
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### "NEXTAUTH_SECRET" environment variable not set

**Solution:** Add the `NEXTAUTH_SECRET` environment variable in Vercel settings
```bash
openssl rand -base64 32
```
Copy the output and add it as an environment variable.

### Cannot connect to backend API

**Solutions:**
1. Verify `API_URL` environment variable is correct
2. Check backend is deployed and running
3. Ensure CORS is configured on backend:
   ```javascript
   app.use(cors({
     origin: process.env.FRONTEND_URL,
     credentials: true
   }));
   ```
4. Check backend logs for errors

### WebSocket connection fails

**Solutions:**
1. Verify `WEBSOCKET_URL` uses `wss://` (not `ws://`)
2. Ensure backend platform supports WebSockets
3. Check firewall/security group settings on backend

### Build warnings about monorepo

This is normal and handled by the `outputFileTracingRoot` setting in `next.config.js`.

### "Module not found: Can't resolve 'fs'"

This is expected for Next.js and handled by webpack config in `next.config.js`. If you see this, it's already configured correctly.

### Environment variables not working

**Solutions:**
1. Make sure client-side variables start with `NEXT_PUBLIC_`
2. Redeploy after adding new environment variables
3. Check the Environment Variables are assigned to the correct environment (Production/Preview/Development)

---

## 📊 Monitoring and Analytics

### Vercel Analytics (Built-in)

Vercel automatically provides:
- Page views
- Performance metrics
- Core Web Vitals

Access at: `https://vercel.com/[team]/[project]/analytics`

### Enable Speed Insights

```bash
npm install @vercel/speed-insights
```

Add to `app/layout.tsx`:
```tsx
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
```

---

## 🔒 Security Best Practices

1. **Never commit secrets** to Git
   - Use environment variables
   - Add `.env.local` to `.gitignore`

2. **Use different secrets** for each environment
   - Different NEXTAUTH_SECRET for production/preview/dev
   - Different API keys

3. **Enable HTTPS only**
   - Vercel provides this by default
   - Set `NEXTAUTH_URL` with `https://`

4. **Set security headers**
   - Already configured in `next.config.js`

5. **Rate limiting**
   - Implement in backend API
   - Use Vercel's rate limiting features

---

## 🚦 Custom Domains

### Add Custom Domain

1. Go to Settings → Domains
2. Add your domain (e.g., `ide.yourdomain.com`)
3. Follow DNS configuration instructions
4. Update environment variables:
   ```
   NEXTAUTH_URL=https://ide.yourdomain.com
   FRONTEND_URL=https://ide.yourdomain.com
   ```

---

## 📈 Performance Optimization

### Already Configured

- ✅ Automatic code splitting
- ✅ Image optimization with Next.js Image
- ✅ Static page generation where possible
- ✅ Compression enabled
- ✅ Caching headers configured

### Additional Optimizations

1. **Enable Vercel Edge Network**
   - Go to Settings → Edge Network
   - Select regions close to your users

2. **Use Vercel Image Optimization**
   ```tsx
   import Image from 'next/image'
   
   <Image src="/logo.png" width={200} height={50} alt="Logo" />
   ```

3. **Implement ISR (Incremental Static Regeneration)**
   ```tsx
   export const revalidate = 60; // Revalidate every 60 seconds
   ```

---

## 📝 Deployment Checklist

Before deploying to production:

- [ ] Backend is deployed and accessible
- [ ] All environment variables are set
- [ ] Secrets are generated securely
- [ ] Build completes successfully locally
- [ ] Tests pass (if implemented)
- [ ] CORS is configured on backend
- [ ] Database connections work
- [ ] Error tracking is set up (e.g., Sentry)
- [ ] Custom domain is configured (if applicable)
- [ ] Backup strategy is in place

---

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)

---

## 💡 Tips

1. **Use Preview Deployments**
   - Test changes before merging to production
   - Share preview URLs with team

2. **Monitor Build Times**
   - Optimize if builds take too long
   - Use Vercel's build cache

3. **Set up Vercel Integrations**
   - GitHub for auto-deployments
   - Slack for deployment notifications
   - Sentry for error tracking

4. **Use Vercel's Database Integrations**
   - Vercel Postgres for PostgreSQL
   - Vercel KV for Redis
   - Vercel Blob for file storage

---

## 🆘 Getting Help

If you encounter issues:

1. Check Vercel build logs
2. Review the Troubleshooting section above
3. Check backend logs
4. Open an issue on GitHub
5. Contact Vercel support: https://vercel.com/support

---

## 📄 Next Steps

After successful deployment:

1. Set up monitoring and alerting
2. Configure custom domain
3. Set up staging environment
4. Implement CI/CD tests
5. Plan scaling strategy

**Your Vercel deployment URL will be provided after successful deployment!** 🎉
