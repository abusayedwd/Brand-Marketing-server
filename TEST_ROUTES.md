# Test Your Vercel Deployment

Wait 1-2 minutes for Vercel to redeploy, then test these URLs:

## 1. Root Endpoint (Should work ✅)
```
https://your-domain.vercel.app/
```
**Expected:** `{"message": "API is running!", ...}`

## 2. Health Endpoint (Should work ✅)
```
https://your-domain.vercel.app/health
```
**Expected:** `{"status": "OK", ...}`

## 3. Test Endpoint (Should work NOW ✅)
```
https://your-domain.vercel.app/test
```
**Expected:** `{"message": "This is influencer API", ...}`

## 4. Test Database Connection
```
https://your-domain.vercel.app/test-db
```
**Expected:**
- ✅ `{"status": "SUCCESS"}` - DB works, /v1 routes will work
- ❌ `{"status": "FAILED"}` - DB failed, follow steps below

## 5. Get Users (Requires DB)
```
https://your-domain.vercel.app/v1/users
```
**Expected:**
- ✅ List of users (if DB connected)
- ❌ Timeout or error (if DB not connected)

---

# If /v1/users Still Doesn't Work

## Step 1: Test Database First
Go to: `https://your-domain.vercel.app/test-db`

### If you see "FAILED" ❌

**Fix MongoDB Atlas:**
1. Go to https://cloud.mongodb.com
2. Click your cluster
3. Click **"Network Access"** (left sidebar)
4. Click **"Add IP Address"**
5. Click **"Allow Access from Anywhere"** (adds 0.0.0.0/0)
6. Click **"Confirm"**
7. **Wait 2-3 minutes**
8. Test again: `https://your-domain.vercel.app/test-db`

## Step 2: Check Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

**Required:**
```
MONGODB_URL = mongodb+srv://username:password@cluster.mongodb.net/dbname
JWT_SECRET = any-random-string
NODE_ENV = production
```

If you added/changed variables:
1. Go to **Deployments** tab
2. Click latest deployment
3. Click **"Redeploy"**

## Step 3: Check Vercel Logs

1. Go to Vercel Dashboard → Your Project
2. Click **"Deployments"**
3. Click latest deployment
4. Click **"View Function Logs"**
5. Look for errors like:
   - `MongoServerSelectionError` → MongoDB Atlas Network Access issue
   - `MONGODB_URL is not set` → Environment variable missing
   - `Connection timeout` → MongoDB not reachable

---

# Quick Summary

**Routes that work without DB:**
- ✅ `/` - Root
- ✅ `/health` - Health check
- ✅ `/test` - Test endpoint (FIXED NOW)
- ✅ `/test-db` - Test DB connection

**Routes that need DB:**
- ❌ `/v1/users` - Get users
- ❌ `/v1/auth/login` - Login
- ❌ `/v1/auth/register` - Register
- ❌ All other `/v1/*` routes

**To fix /v1/* routes:**
1. Make sure `/test-db` shows "SUCCESS"
2. If not, fix MongoDB Atlas Network Access (0.0.0.0/0)
3. Verify MONGODB_URL in Vercel environment variables
