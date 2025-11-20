# Vercel Deployment Checklist

## Issues Fixed

### 1. Missing Passport Authentication
- **Problem**: The simplified app.js was missing passport initialization, causing authentication middleware to fail
- **Solution**: Added passport initialization and JWT strategy to app.js:126-184

### 2. Missing Security Middleware
- **Problem**: Essential middleware (helmet, xss-clean, mongo-sanitize) was removed
- **Solution**: Re-added all security middleware with proper configuration

### 3. Vercel Configuration
- **Problem**: Missing builds configuration in vercel.json
- **Solution**: Added builds section with @vercel/node builder and proper timeout settings (30 seconds)

### 4. Database Connection Timeouts
- **Problem**: Connection timeout was too short (5 seconds) for cold starts
- **Solution**: Increased to 10 seconds with better retry configuration

## Environment Variables Required in Vercel

Make sure these environment variables are set in your Vercel project settings:

```
NODE_ENV=production
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-here
JWT_ACCESS_EXPIRATION_MINUTES=30
JWT_REFRESH_EXPIRATION_DAYS=30
JWT_RESET_PASSWORD_EXPIRATION_MINUTES=10
JWT_VERIFY_EMAIL_EXPIRATION_MINUTES=10
PORT=3000

# Optional SMTP settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

## MongoDB Atlas Configuration

**CRITICAL**: You must allow Vercel's IP addresses to connect to MongoDB Atlas:

1. Go to MongoDB Atlas Dashboard
2. Navigate to Network Access
3. Click "Add IP Address"
4. Select "Allow Access from Anywhere" (0.0.0.0/0) OR
5. Add all Vercel IP ranges (recommended for production)

Without this, your API routes will timeout when trying to connect to the database.

## Testing Your Deployment

After deploying, test these endpoints:

1. **Health Check** (No DB required):
   ```bash
   curl https://your-domain.vercel.app/health
   ```
   Should return 200 OK immediately

2. **Root Endpoint** (No DB required):
   ```bash
   curl https://your-domain.vercel.app/
   ```
   Should return API information

3. **Auth Register** (Requires DB):
   ```bash
   curl -X POST https://your-domain.vercel.app/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Password123!","name":"Test User"}'
   ```

4. **Diagnostic Endpoint** (Check DB connection):
   ```bash
   curl https://your-domain.vercel.app/diagnostic
   ```

## Common Issues and Solutions

### Routes show "Loading..." or timeout
- **Cause**: Database connection is failing or timing out
- **Solution**: Check MongoDB Atlas network access settings (allow 0.0.0.0/0)
- **Solution**: Verify MONGODB_URL environment variable is correct

### "You are not authorized" errors
- **Cause**: Passport not initialized properly (FIXED in this update)
- **Solution**: Already fixed in app.js

### CORS errors
- **Cause**: Origin not allowed
- **Solution**: Already configured to allow all origins (origin: true)

### 504 Gateway Timeout
- **Cause**: Function execution exceeds 10 seconds (free tier) or 30 seconds (pro)
- **Solution**: Upgraded to 30 second timeout in vercel.json (requires Pro plan)
- **Alternative**: Optimize cold start by keeping connections warm

## Deployment Commands

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs your-deployment-url
```

## What Changed

### src/app.js
- Added passport initialization and JWT strategy
- Added security middleware (helmet, xss-clean, mongo-sanitize)
- Added compression and static file serving
- Added morgan logging (skipped in test environment)

### vercel.json
- Added builds configuration with @vercel/node
- Set maxDuration to 30 seconds
- Added functions configuration with memory: 1024MB

### src/index.js
- Increased database connection timeout from 5s to 10s
- Improved connection pooling settings
- Added retryWrites and retryReads options

## Post-Deployment Verification

1. Check Vercel deployment logs for any errors
2. Test all API endpoints (especially /v1/auth/login, /v1/auth/register)
3. Verify database operations are working
4. Test protected routes with JWT token
5. Monitor response times (should be <2s after cold start)

## Performance Tips

1. **Keep connections warm**: Use a service like Uptime Robot to ping /health every 5 minutes
2. **Optimize cold starts**: Database connection caching is already implemented
3. **Monitor logs**: Use Vercel dashboard to track errors and performance
4. **Use CDN**: Vercel automatically handles this for static assets

## Support

If routes still don't work after deployment:
1. Check Vercel logs: `vercel logs`
2. Visit the /diagnostic endpoint to check configuration
3. Ensure all environment variables are set correctly
4. Verify MongoDB Atlas allows connections from 0.0.0.0/0
