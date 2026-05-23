# VedaAI — AI Assessment Creator

Production-grade AI-powered exam paper generator for teachers.

## Tech Stack

| Layer     | Tech                                    |
|-----------|----------------------------------------|
| Frontend  | Next.js 14 + TypeScript + Zustand       |
| Backend   | Node.js + Express + TypeScript          |
| AI        | Groq + Llama 3.3 70b                    |
| Queue     | BullMQ (background jobs, retries)       |
| Database  | MongoDB Atlas                           |
| Cache     | Upstash Redis                           |
| Deploy FE | Vercel                                  |
| Deploy BE | Render (API + Worker as separate svcs)  |

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Redis (local or Upstash)
- Groq API key (free at console.groq.com)

### Backend
```bash
cd backend
cp .env.example .env       # Mac/Linux
copy .env.example .env     # Windows
# Fill in MONGODB_URI, REDIS_URL, GROQ_API_KEY
npm install
npm run dev          # API server on :4000
npm run dev:worker   # Generation worker (separate terminal)
```

### Frontend
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev          # on :3000
```

---

## Deployment

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/vedaai.git
git push -u origin main
```

### Step 2 — Deploy Backend to Render
1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo
3. **Root Directory:** `backend`
4. **Build Command:** `npm install && npm run build`
5. **Start Command:** `npm start`
6. Add environment variables:
   ```
   NODE_ENV=production
   PORT=4000
   MONGODB_URI=mongodb+srv://...
   REDIS_URL=rediss://...
   GROQ_API_KEY=gsk_...
   FRONTEND_URL=https://your-app.vercel.app
   ```
7. Click **Deploy**
8. Copy your Render URL: `https://vedaai-backend.onrender.com`

### Step 3 — Deploy Worker to Render
1. New → **Background Worker**
2. Same repo, Root Directory: `backend`
3. **Start Command:** `npm run start:worker`
4. Same env vars as the API service
5. Deploy

### Step 4 — Deploy Frontend to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. **Root Directory:** `frontend`
4. Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://vedaai-backend.onrender.com
   NEXT_PUBLIC_WS_URL=wss://vedaai-backend.onrender.com
   ```
5. Click **Deploy**

### Step 5 — Update CORS
Go back to Render → your API service → Environment:
```
FRONTEND_URL=https://your-app.vercel.app
```
Redeploy.

---

## Architecture

```
Teacher fills 2-step form
        │
        ▼
POST /api/assignments         ← Validates, saves to MongoDB, responds immediately
        │
        ▼
BullMQ job enqueued           ← Job ID saved to assignment document
        │
        ▼
Worker picks up job           ← Separate process, 3 retries with exponential backoff
  ├─ Builds dynamic prompt
  ├─ Calls Llama 3.3 on Groq
  ├─ Parses JSON response
  ├─ Saves paper to MongoDB
  └─ Caches in Redis (10 min)
        │
        ▼
WebSocket PUSH to frontend    ← Real-time: progress% → complete/failed
        │
        ▼
Output page renders paper     ← Structured sections, difficulty badges, answer key
```

## Features
- ✅ Figma-faithful UI (sidebar, cards, form, paper output)
- ✅ Two-step assignment creation with file upload
- ✅ BullMQ job queue — 3 retries, exponential backoff
- ✅ Real-time WebSocket progress with auto-reconnect
- ✅ MongoDB persistence — data survives restarts
- ✅ Redis caching — fast repeat reads
- ✅ Rate limiting (100 req/15min, 10 creates/min)
- ✅ Helmet security headers
- ✅ Teacher profile settings — persisted
- ✅ Search and filter assignments
- ✅ Answer key toggle
- ✅ Regenerate paper
- ✅ Delete assignments
- ✅ Mobile responsive with bottom tab bar
- ✅ Skeleton loading states
- ✅ Toast notifications
- ✅ Graceful shutdown handling
