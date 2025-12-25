# Vercel Quick Start Guide

⚡ **Fast track to deploying on Vercel** - Complete in 10 minutes!

## Prerequisites Checklist

- [ ] GitHub/GitLab account with this repo
- [ ] Vercel account (free at [vercel.com](https://vercel.com))
- [ ] Backend deployed (Railway/Render/Fly.io)
- [ ] Environment secrets generated

---

## 🚀 Deploy in 4 Steps

### Step 1: Prepare Secrets (2 min)

Generate two random secrets:

```bash
# Run these commands
openssl rand -base64 32  # For NEXTAUTH_SECRET
openssl rand -base64 32  # For JWT_SECRET
```

Save both outputs - you'll need them in Step 3.

---

### Step 2: Import to Vercel (2 min)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select `Algodons/algo`
4. **Important:** Set Root Directory to `frontend`
5. Keep defaults for everything else
6. Click "Deploy" (don't worry, it will ask for env vars)

---

### Step 3: Configure Environment Variables (5 min)

While deployment is paused, add these variables:

#### Required Variables

```env
# Your Vercel URL (will be provided after first deployment)
NEXTAUTH_URL=https://your-app.vercel.app

# Paste the secrets you generated in Step 1
NEXTAUTH_SECRET=your-first-secret-here
JWT_SECRET=your-second-secret-here

# Your backend API URL (Railway/Render/etc.)
API_URL=https://your-backend.railway.app
WEBSOCKET_URL=wss://your-backend.railway.app

# Frontend URL (same as NEXTAUTH_URL)
FRONTEND_URL=https://your-app.vercel.app

# Public variables (same backend URL)
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-backend.railway.app
```

**Where to add:**
- Project Settings → Environment Variables
- Select: Production, Preview, Development
- Click "Save"

---

### Step 4: Deploy! (1 min)

1. Click "Continue to Dashboard"
2. Click "Redeploy" (to apply env vars)
3. Wait 2-3 minutes
4. Click "Visit" to see your app!

---

## ✅ Verification

### Test Your Deployment

1. Visit your Vercel URL
2. Open browser DevTools (F12)
3. Check Console for errors
4. Test API connection:

```javascript
// Paste in browser console
fetch(process.env.NEXT_PUBLIC_API_URL + '/api/health')
  .then(r => r.json())
  .then(console.log)
```

Expected: `{ status: "ok" }`

---

## 🐛 Common Issues (Quick Fixes)

### "NEXTAUTH_SECRET not found"
→ Go to Settings → Environment Variables → Add it → Redeploy

### API calls fail
→ Check `NEXT_PUBLIC_API_URL` is correct and backend is running

### WebSocket won't connect
→ Use `wss://` not `ws://` in `NEXT_PUBLIC_WEBSOCKET_URL`

### Build fails
→ Check build logs in Vercel dashboard
→ See [VERCEL_TROUBLESHOOTING.md](./VERCEL_TROUBLESHOOTING.md)

---

## 🎯 What's Next?

**After successful deployment:**

1. **Custom Domain** (Optional)
   - Settings → Domains → Add your domain
   - Update `NEXTAUTH_URL` and `FRONTEND_URL`

2. **Backend CORS**
   - Add your Vercel URL to backend CORS config
   - Restart backend

3. **Team Access**
   - Settings → Team → Invite members

4. **Monitoring**
   - Enable Vercel Analytics (free)
   - Set up error tracking (Sentry)

---

## 📚 Full Documentation

- **Complete Guide:** [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
- **Troubleshooting:** [VERCEL_TROUBLESHOOTING.md](./VERCEL_TROUBLESHOOTING.md)
- **Backend Setup:** See VERCEL_DEPLOYMENT.md → Step 1

---

## 🆘 Need Help?

**Before asking:**
1. Check [VERCEL_TROUBLESHOOTING.md](./VERCEL_TROUBLESHOOTING.md)
2. View Vercel build logs
3. Check browser console

**Get help:**
- GitHub Issues: [github.com/Algodons/algo/issues](https://github.com/Algodons/algo/issues)
- Vercel Support: [vercel.com/support](https://vercel.com/support)

---

## 📋 Deployment Checklist

- [ ] Secrets generated
- [ ] Backend deployed and accessible
- [ ] Repository imported to Vercel
- [ ] Root directory set to `frontend`
- [ ] All 8 environment variables added
- [ ] Deployment successful
- [ ] Homepage loads without errors
- [ ] API connection works
- [ ] No console errors

**All checked?** 🎉 You're live on Vercel!

---

## ⚡ Quick Commands

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from CLI
cd frontend
vercel --prod

# View logs
vercel logs

# Pull env variables locally
vercel env pull .env.local
```

---

**Total Time:** ~10 minutes ⏱️

**Difficulty:** Easy 🟢

**Cost:** Free tier available 💰

Good luck! 🚀
