# Deployment Guide

This guide will walk you through deploying the Family Hub application for free using Railway (backend) and Vercel (frontend).

## Backend Deployment (Railway)

Railway offers free tier with PostgreSQL database included.

### Step 1: Prepare Your Repository

1. Push your code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 2: Deploy to Railway

1. Go to [Railway.app](https://railway.app) and sign up
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `family-hub` repository
5. Railway will detect it's a Rails app automatically

### Step 3: Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically create and link the database

### Step 4: Configure Environment Variables

In your Railway backend service settings, add these environment variables:

```
RAILS_ENV=production
RAILS_MASTER_KEY=<generate with: rails secret>
FRONTEND_URL=<your-vercel-url-here>
```

Railway automatically sets these database variables:
- DATABASE_URL (automatically configured)
- PGHOST
- PGPORT
- PGDATABASE
- PGUSER
- PGPASSWORD

### Step 5: Update database.yml for Railway

Make sure your `backend/config/database.yml` has this production configuration:

```yaml
production:
  <<: *default
  url: <%= ENV['DATABASE_URL'] %>
```

### Step 6: Deploy

1. Railway will automatically deploy when you push to GitHub
2. Get your backend URL from Railway dashboard
3. Test it: `https://<your-app>.railway.app/api/v1/family_members`

## Frontend Deployment (Vercel)

Vercel offers free hosting for frontend applications.

### Step 1: Deploy to Vercel

1. Go to [Vercel.com](https://vercel.com) and sign up
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure the project:

**Root Directory:** `frontend`

**Build Settings:**
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

### Step 2: Set Environment Variables

In Vercel project settings → Environment Variables, add:

```
VITE_API_URL=https://<your-railway-app>.railway.app
```

### Step 3: Deploy

1. Click "Deploy"
2. Vercel will build and deploy your app
3. You'll get a URL like: `https://<your-app>.vercel.app`

### Step 4: Update Backend CORS

Go back to Railway and update the `FRONTEND_URL` environment variable:

```
FRONTEND_URL=https://<your-app>.vercel.app
```

## Alternative Free Hosting Options

### Backend Alternatives

**Render.com** (Free tier includes PostgreSQL):
1. Create new Web Service from GitHub
2. Add PostgreSQL database
3. Set environment variables
4. Deploy

**Fly.io** (Free tier with limitations):
1. Install flyctl CLI
2. Run `fly launch` in backend directory
3. Add Postgres: `fly postgres create`
4. Attach database: `fly postgres attach`
5. Deploy: `fly deploy`

### Frontend Alternatives

**Netlify** (Free tier):
1. Sign up at Netlify.com
2. New site from Git
3. Base directory: `frontend`
4. Build command: `npm run build`
5. Publish directory: `frontend/dist`
6. Environment variable: `VITE_API_URL`

## Post-Deployment Checklist

- [ ] Backend API is accessible
- [ ] Database migrations ran successfully
- [ ] Family members are seeded in database
- [ ] Frontend loads without errors
- [ ] Frontend can communicate with backend
- [ ] CORS is properly configured
- [ ] Environment variables are set correctly
- [ ] Test all features:
  - [ ] View family members
  - [ ] Add/edit/delete chores
  - [ ] Add/edit/delete grocery items
  - [ ] Mark items as complete
  - [ ] Monthly background theme is working

## Troubleshooting

### Backend Issues

**500 Error on Railway:**
- Check Railway logs for error messages
- Ensure database migrations ran: `rails db:migrate`
- Verify environment variables are set

**Database Connection Error:**
- Ensure PostgreSQL plugin is added
- Check if DATABASE_URL is set
- Verify database.yml production config

### Frontend Issues

**API Connection Error:**
- Verify VITE_API_URL environment variable
- Check browser console for CORS errors
- Ensure backend FRONTEND_URL includes your Vercel domain

**Build Fails on Vercel:**
- Check build logs
- Ensure all dependencies are in package.json
- Verify build command is correct

### CORS Errors

If you see CORS errors in the browser:

1. Update backend CORS configuration in `config/initializers/cors.rb`
2. Set FRONTEND_URL environment variable on Railway
3. Redeploy backend

## Monitoring

**Railway:**
- View logs: Project → Service → Logs
- Monitor usage: Project → Settings → Usage

**Vercel:**
- View deployments: Project → Deployments
- Check logs: Deployment → View Function Logs

## Updating the Application

**For Backend:**
1. Push changes to GitHub
2. Railway auto-deploys from main branch

**For Frontend:**
1. Push changes to GitHub
2. Vercel auto-deploys from main branch

## Cost Considerations

**Free Tier Limits:**

**Railway:**
- $5 free credit per month
- Shared CPU
- 512MB RAM
- 1GB disk

**Vercel:**
- 100GB bandwidth per month
- Unlimited websites
- Free SSL

If you exceed free tiers:
- Railway: ~$5-10/month for hobby usage
- Vercel: Free tier is usually sufficient

## Custom Domain (Optional)

**Railway:**
1. Project Settings → Domains
2. Add custom domain
3. Update DNS records

**Vercel:**
1. Project Settings → Domains
2. Add custom domain
3. Update DNS records

## Security Notes

1. Never commit secrets to Git
2. Use environment variables for all sensitive data
3. Enable SSL (automatic on both platforms)
4. Keep dependencies updated
5. Monitor Railway/Vercel logs regularly

## Backup Strategy

**Database Backups:**
- Railway has automatic backups
- For manual backup: Use Railway CLI or pg_dump
- Consider setting up automated backups to external storage

## Support

For deployment issues:
- Railway: https://railway.app/help
- Vercel: https://vercel.com/support
