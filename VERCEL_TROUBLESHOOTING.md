# Vercel Deployment Troubleshooting Guide

This document provides solutions to common issues encountered when deploying to Vercel.

## 🔍 Common Build Issues

### Issue 1: Build Fails with "Module not found"

**Error Message:**
```
Module not found: Can't resolve 'xyz'
```

**Solutions:**

1. **Missing dependency in package.json**
   ```bash
   cd frontend
   npm install xyz
   git add package.json package-lock.json
   git commit -m "Add missing dependency"
   git push
   ```

2. **Wrong import path**
   - Check the import statement
   - Ensure the file path is correct
   - Use relative imports properly

3. **Case-sensitive file names**
   - Vercel's file system is case-sensitive
   - Check that file names match exactly (e.g., `Component.tsx` vs `component.tsx`)

---

### Issue 2: Environment Variables Not Working

**Symptoms:**
- App loads but features don't work
- API calls fail
- `undefined` values in the console

**Solutions:**

1. **Verify variables are set in Vercel**
   - Go to Project Settings → Environment Variables
   - Check all required variables are present

2. **Client-side variables must be prefixed**
   ```env
   # ❌ Won't work on client
   API_URL=https://api.example.com
   
   # ✅ Will work on client
   NEXT_PUBLIC_API_URL=https://api.example.com
   ```

3. **Redeploy after adding variables**
   - Environment variables only apply to new deployments
   - Click "Redeploy" or push a new commit

4. **Check variable scope**
   - Ensure variables are set for the correct environment (Production/Preview/Development)

---

### Issue 3: "NEXTAUTH_SECRET" or "JWT_SECRET" Error

**Error Message:**
```
[next-auth][error][NO_SECRET]
```

**Solutions:**

1. **Generate a secure secret**
   ```bash
   openssl rand -base64 32
   ```

2. **Add to Vercel environment variables**
   - Variable: `NEXTAUTH_SECRET`
   - Value: Your generated secret
   - Environments: Production, Preview, Development

3. **Verify in next-auth configuration**
   ```typescript
   // Make sure your auth config has the secret
   export const authOptions = {
     secret: process.env.NEXTAUTH_SECRET,
     // ... other options
   }
   ```

---

### Issue 4: API Calls Failing (CORS Errors)

**Error Message in Browser Console:**
```
Access to fetch at 'https://api.example.com' from origin 'https://yourapp.vercel.app' has been blocked by CORS policy
```

**Solutions:**

1. **Configure CORS on backend**
   ```javascript
   // backend/src/index.ts
   import cors from 'cors';
   
   app.use(cors({
     origin: process.env.FRONTEND_URL || 'http://localhost:3000',
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization']
   }));
   ```

2. **Set correct FRONTEND_URL on backend**
   ```env
   FRONTEND_URL=https://yourapp.vercel.app
   ```

3. **Verify API_URL is correct**
   ```env
   # On Vercel
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```

4. **Check for HTTPS**
   - API must be HTTPS, not HTTP
   - WebSocket must be WSS, not WS

---

### Issue 5: WebSocket Connection Fails

**Error Message:**
```
WebSocket connection to 'ws://...' failed
```

**Solutions:**

1. **Use WSS instead of WS**
   ```env
   # ❌ Wrong
   NEXT_PUBLIC_WEBSOCKET_URL=ws://api.example.com
   
   # ✅ Correct
   NEXT_PUBLIC_WEBSOCKET_URL=wss://api.example.com
   ```

2. **Verify backend supports WebSockets**
   - Railway, Render, Fly.io: ✅ Supported
   - Vercel Serverless Functions: ❌ Not supported (need separate backend)

3. **Check backend WebSocket configuration**
   ```javascript
   // Make sure WebSocket server allows your origin
   const io = new Server(server, {
     cors: {
       origin: process.env.FRONTEND_URL,
       credentials: true
     }
   });
   ```

---

### Issue 6: Build Succeeds but Page Shows Error

**Symptoms:**
- Build completes successfully
- Deployment shows "Ready"
- But page shows error or blank screen

**Solutions:**

1. **Check browser console**
   - Open DevTools (F12)
   - Look for errors in Console tab
   - Check Network tab for failed requests

2. **Check Vercel Function Logs**
   - Go to your deployment in Vercel
   - Click "Functions" tab
   - Look for error logs

3. **Verify environment variables**
   ```javascript
   // Add debugging
   console.log('API_URL:', process.env.NEXT_PUBLIC_API_URL);
   ```

4. **Check if backend is running**
   ```bash
   curl https://your-backend.railway.app/api/health
   ```

---

### Issue 7: Build Times Out

**Error Message:**
```
Error: Command "npm run build" exceeded the time limit of 15m
```

**Solutions:**

1. **Optimize build**
   - Remove unused dependencies
   - Check for infinite loops in build scripts
   - Reduce bundle size

2. **Upgrade Vercel plan**
   - Free plan: 15 minute timeout
   - Pro plan: 45 minute timeout

3. **Use Turbo**
   ```json
   {
     "scripts": {
       "build": "turbo run build"
     }
   }
   ```

---

### Issue 8: "Module parse failed" Errors

**Error Message:**
```
Module parse failed: Unexpected token
```

**Solutions:**

1. **Check Next.js configuration**
   ```javascript
   // next.config.js
   module.exports = {
     webpack: (config, { isServer }) => {
       if (!isServer) {
         config.resolve.fallback = {
           fs: false,
           net: false,
           tls: false,
         };
       }
       return config;
     },
   };
   ```

2. **Update dependencies**
   ```bash
   cd frontend
   npm update
   ```

3. **Check for invalid imports**
   - Don't import server-side code in client components
   - Use dynamic imports when needed

---

### Issue 9: Images Not Loading

**Symptoms:**
- Images show broken icon
- Console shows 404 errors

**Solutions:**

1. **Use Next.js Image component**
   ```tsx
   import Image from 'next/image'
   
   // Instead of <img>
   <Image 
     src="/logo.png" 
     width={200} 
     height={100} 
     alt="Logo"
   />
   ```

2. **Configure image domains**
   ```javascript
   // next.config.js
   module.exports = {
     images: {
       domains: ['your-cdn.com', 'your-backend.com'],
     },
   };
   ```

3. **Check image paths**
   ```tsx
   // ✅ Correct - public folder
   <Image src="/images/logo.png" />
   
   // ❌ Wrong
   <Image src="./images/logo.png" />
   ```

---

### Issue 10: Database Connection Issues

**Error Message:**
```
Error: connect ETIMEDOUT
```

**Solutions:**

1. **Check database URL**
   ```env
   # Verify connection string is correct
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   ```

2. **Verify IP whitelisting**
   - Add Vercel IP addresses to database firewall
   - Or allow all IPs (0.0.0.0/0) for testing

3. **Use connection pooling**
   ```javascript
   // For PostgreSQL with Prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     connection_limit = 5
   }
   ```

4. **Use Vercel's database integrations**
   - Vercel Postgres
   - Vercel KV (Redis)
   - Automatically configured

---

## 🔧 Debugging Tips

### Enable Verbose Logging

Add to `next.config.js`:
```javascript
module.exports = {
  // ... other config
  generateBuildId: async () => {
    console.log('Building with Next.js version:', require('next/package.json').version);
    return 'build-' + Date.now();
  },
};
```

### Check Build Logs

1. Go to Vercel dashboard
2. Click on your deployment
3. View "Building" section for detailed logs

### Test Locally with Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Pull environment variables
cd frontend
vercel env pull .env.local

# Test build locally
npm run build

# Test with Vercel dev server
vercel dev
```

### Use Vercel Logs

```bash
# View real-time logs
vercel logs [deployment-url]

# View function logs
vercel logs --follow
```

---

## 🚨 Emergency Recovery

### Rollback to Previous Deployment

1. Go to Vercel dashboard
2. Click "Deployments" tab
3. Find a working deployment
4. Click the three dots (...)
5. Select "Promote to Production"

### Redeploy from Specific Commit

```bash
# Using Vercel CLI
vercel --prod --force

# Or specify a Git commit
vercel git [commit-hash] --prod
```

---

## 📞 Getting Help

### Check Vercel Status

Visit: https://www.vercel-status.com/

### Vercel Support

- Community: https://github.com/vercel/vercel/discussions
- Twitter: https://twitter.com/vercel
- Support: https://vercel.com/support

### Project-Specific Help

Open an issue: https://github.com/Algodons/algo/issues

---

## 📋 Pre-Deployment Checklist

Before deploying, verify:

- [ ] All environment variables are set
- [ ] Backend is deployed and accessible
- [ ] Build succeeds locally: `npm run build`
- [ ] No console errors in development
- [ ] API endpoints are reachable
- [ ] Database connections work
- [ ] CORS is configured
- [ ] Security headers are set

---

## 🔗 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Build Configuration](https://vercel.com/docs/build-step)
- [Troubleshooting Guide](https://vercel.com/docs/platform/limits)

---

## 💡 Best Practices

1. **Use Preview Deployments**
   - Test in preview before promoting to production
   - Share preview URLs with team for review

2. **Monitor Build Times**
   - Keep builds under 5 minutes when possible
   - Use caching to speed up builds

3. **Set Up Monitoring**
   - Enable Vercel Analytics
   - Use Sentry for error tracking
   - Monitor API response times

4. **Use Environment-Specific Configs**
   - Different values for dev/preview/production
   - Test with production-like data in preview

5. **Keep Dependencies Updated**
   ```bash
   npm outdated
   npm update
   ```

6. **Regular Security Audits**
   ```bash
   npm audit
   npm audit fix
   ```

---

Remember: Most deployment issues are due to environment variables or backend connectivity. Always check these first! 🚀
