# QUICK FIX: Routes Timing Out (Loading Forever)

## The Problem
✅ Root endpoint (`/`) works fine
❌ API routes (`/v1/users`, `/v1/auth/login`, etc.) keep loading and timeout

**Root Cause:** Database connection is failing or timing out

---

## Step 1: Test Database Connection (IMPORTANT!)

After Vercel redeploys, visit this URL in your browser:
```
https://your-domain.vercel.app/test-db
```

### If you see SUCCESS ✅
Your database is connected! Routes should work.

### If you see FAILED ❌
Follow the steps below to fix it.

---

## Step 2: Fix MongoDB Atlas Network Access (MOST COMMON ISSUE)

**THIS IS THE #1 REASON FOR TIMEOUT!**

1. Go to https://cloud.mongodb.com
2. Select your cluster
3. Click **"Network Access"** in the left sidebar
4. Click **"Add IP Address"**
5. Click **"Allow Access from Anywhere"**
   - This adds `0.0.0.0/0` which allows Vercel's serverless functions
6. Click **"Confirm"**

⚠️ **Wait 2-3 minutes** for MongoDB to apply the changes!

Then test again: `https://your-domain.vercel.app/test-db`

---

## Step 3: Verify Environment Variables in Vercel

1. Go to https://vercel.com/dashboard
2. Select your project
3. Click **"Settings"** → **"Environment Variables"**
4. Make sure these are set:

```
MONGODB_URL = mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
JWT_SECRET = any-long-random-string-here
NODE_ENV = production
JWT_ACCESS_EXPIRATION_MINUTES = 30
JWT_REFRESH_EXPIRATION_DAYS = 30
```

5. If you added/changed any variables, go to **"Deployments"** tab
6. Click the latest deployment → **"Redeploy"**

---

## Step 4: Test Your API Routes

After fixing, test these endpoints:

### 1. Health Check (No DB - should always work):
```bash
curl https://your-domain.vercel.app/health
```

### 2. Database Test (Tests DB connection):
```bash
curl https://your-domain.vercel.app/test-db
```
Should return `"status": "SUCCESS"`

### 3. Register a User (Full DB operation):
```bash
curl -X POST https://your-domain.vercel.app/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!",
    "name": "Test User"
  }'
```

---

## Common Issues & Solutions

### Issue: Still timing out after MongoDB Network Access fix
**Solution:**
- Wait 2-3 minutes for MongoDB changes to apply
- Clear your browser cache
- Try from a different browser/incognito mode

### Issue: "MONGODB_URL is not set" error
**Solution:**
- Add MONGODB_URL in Vercel dashboard environment variables
- Redeploy the project

### Issue: "You are not authorized" on protected routes
**Solution:**
- This is normal! You need a valid JWT token
- First register/login to get a token
- Include token in header: `Authorization: Bearer YOUR_TOKEN`

### Issue: Routes work sometimes, timeout other times
**Solution:**
- This is cold start behavior on free tier
- Upgrade to Vercel Pro for better performance
- Or use a service to ping `/health` every 5 minutes to keep it warm

---

## Verification Checklist

- [ ] MongoDB Atlas allows 0.0.0.0/0 in Network Access
- [ ] MONGODB_URL is set in Vercel dashboard
- [ ] JWT_SECRET is set in Vercel dashboard
- [ ] `/health` endpoint returns 200 OK
- [ ] `/test-db` endpoint returns "SUCCESS"
- [ ] `/v1/auth/register` accepts new users

---

## Still Not Working?

Check Vercel logs:
1. Go to Vercel dashboard → Your project
2. Click **"Deployments"**
3. Click the latest deployment
4. Click **"View Function Logs"**
5. Look for MongoDB connection errors

**Common errors in logs:**
- `MongoServerSelectionError` → MongoDB Atlas Network Access issue
- `MONGODB_URL is not set` → Environment variable missing
- `Connection timeout` → MongoDB Atlas not reachable from Vercel

---

## Need Help?

1. Check `/test-db` endpoint first
2. Look at Vercel function logs
3. Verify MongoDB Atlas Network Access allows 0.0.0.0/0
4. Make sure environment variables are set correctly
