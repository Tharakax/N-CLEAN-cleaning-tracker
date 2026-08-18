# 🚀 N-CLEAN Cleaning Tracker - Deployment Guide

This repository is configured to be deployed either as a **Unified Single-Service App** (Node.js Express + React Vite bundled together) or as **Separate Services** (Frontend on Vercel/Netlify + Backend on Render/Railway/Fly.io) or via **Docker**.

---

## 📋 Required Environment Variables

### Backend (`server`)
| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | Port for Express server | `5000` |
| `NODE_ENV` | Environment mode | `production` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/nclean?retryWrites=true&w=majority` |
| `JWT_SECRET` | Strong secret key for signing JWTs | `a_long_random_secret_string` |
| `CLIENT_URL` | *(Optional)* Frontend domain(s) for CORS when deployed separately | `https://nclean.vercel.app` (or omitted for unified) |

### Frontend (`client`)
| Variable | Description | Example / Default |
|---|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API Key | `AIzaSy...` |
| `VITE_API_URL` | *(Optional)* Full backend API URL if frontend is hosted separately | `https://nclean-api.onrender.com/api` (Leave empty if unified) |
| `VITE_SUPABASE_URL` | *(Optional)* Supabase Storage project URL | `https://ombvnpeoietugpxelugs.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(Optional)* Supabase Storage anon/public key | `eyJhbG...` |

---

## Option 1: Unified All-in-One Deployment (Recommended: Render / Railway / Fly.io)

In this mode, Express serves the REST API as well as the compiled React SPA from `client/dist`.

### Deploying on [Render](https://render.com)
1. Push your code to GitHub.
2. Log into Render, click **New +** -> **Blueprint** and connect your repository (Render automatically reads `render.yaml`).
   - *Alternatively*, click **New +** -> **Web Service**:
     - **Build Command**: `npm run build`
     - **Start Command**: `npm start`
3. In the **Environment Variables** section, set:
   - `NODE_ENV` = `production`
   - `MONGO_URI` = `mongodb+srv://...`
   - `JWT_SECRET` = `<random_string>`
   - `VITE_GOOGLE_MAPS_API_KEY` = `<your_api_key>`
4. Click **Deploy Web Service**.

---

## Option 2: Split Deployment (Vercel Frontend + Render Backend)

### Backend on Render / Railway
1. Create a Web Service with:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `MONGO_URI` = `mongodb+srv://...`
     - `JWT_SECRET` = `<random_string>`
     - `CLIENT_URL` = `https://your-nclean-frontend.vercel.app`
2. Note your backend URL (e.g. `https://nclean-api.onrender.com`).

### Frontend on [Vercel](https://vercel.com)
1. Import your Git repository in Vercel.
2. In Project Settings:
   - **Root Directory**: `client`
   - **Framework Preset**: `Vite`
3. Add Environment Variables:
   - `VITE_API_URL` = `https://nclean-api.onrender.com/api`
   - `VITE_GOOGLE_MAPS_API_KEY` = `<your_api_key>`
4. Click **Deploy**. (SPA rewrites are pre-configured in `client/vercel.json`).

---

## Option 3: Docker Deployment

1. **Build the container image**:
   ```bash
   docker build \
     --build-arg VITE_GOOGLE_MAPS_API_KEY="your_api_key" \
     -t nclean-app .
   ```

2. **Run the container**:
   ```bash
   docker run -d \
     -p 5000:5000 \
     -e MONGO_URI="mongodb+srv://..." \
     -e JWT_SECRET="your_secret" \
     -e NODE_ENV="production" \
     --name nclean nclean-app
   ```
