# HireKarma — Job Scraper Platform

> Full Stack Engineering Assessment Submission — HireKarma Pvt. Ltd. · SDE-1

A production-ready job scraper web application built with **React/Vite/TypeScript** (frontend) and **FastAPI/Python** (backend), featuring JWT authentication, multi-platform job scraping, application tracking, and **Gemini AI** integration for smart job matching.

---

## 🌐 Live Demo

| Service | URL |
|---------|-----|
| Frontend | `https://hirekarma.vercel.app` |
| Backend API | `https://hirekarma-api.railway.app` |
| API Docs | `https://hirekarma-api.railway.app/docs` |

---

## ✨ Features

### Core
- 🔐 **JWT Authentication** — Signup, login, protected routes
- 🔍 **Multi-Platform Job Scraping** — LinkedIn, Naukri, Internshala, Unstop (concurrent)
- 📋 **Application Tracking** — Record applications, update statuses (Applied/Interview/Offer/Rejected)
- 🔖 **Bookmarks** — Save jobs for later with AI summaries
- 👤 **Profile Management** — Full CRUD: avatar upload/delete, bio, resume upload

### AI Features (Gemini-powered)
- ⚡ **AI Job Matching** — Score every job against your uploaded resume (0–100%)
- 📝 **AI Job Summaries** — Gemini-generated bullet-point summaries for bookmarked jobs
- 💡 **Keyword Recommendations** — Suggest better search terms based on your resume
- 🎯 **Smart Filter** — Natural language filtering ("show only remote React jobs with TypeScript")

### Bonus
- 📊 **Dashboard Stats** — Applications, bookmarks, interview/offer counts
- 🎛️ **Platform Filters** — Filter results by LinkedIn/Naukri/Internshala/Unstop
- 📱 **Responsive Design** — Mobile bottom nav + desktop sidebar
- 🌙 **Dark Theme** — Premium dark UI with glass morphism
- 📄 **Pagination** — Applications history with page controls

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 |
| State | Zustand |
| HTTP | Axios |
| Backend | Python 3.11 + FastAPI |
| Database | SQLite (via SQLAlchemy async + aiosqlite) |
| Auth | JWT (python-jose + passlib bcrypt) |
| Scraping | httpx + BeautifulSoup4 + lxml |
| AI | Google Gemini 1.5 Flash |
| Deploy FE | Vercel |
| Deploy BE | Railway / Render |

---

## 🚀 Local Setup

### Prerequisites
- Node.js 18+
- Python 3.11+

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set SECRET_KEY and optionally GEMINI_API_KEY

# Run development server
uvicorn main:app --reload --port 8000
```

API available at: http://localhost:8000  
Swagger docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — set VITE_API_URL=http://localhost:8000/api

# Run development server
npm run dev
```

App available at: http://localhost:5173

---

## 🌍 Deployment

### Frontend → Vercel

```bash
cd frontend
npm install -g vercel
vercel --prod
# Set env var: VITE_API_URL = https://your-api.railway.app/api
```

### Backend → Railway

```bash
# In Railway dashboard:
# 1. Connect GitHub repo
# 2. Set root directory to /backend
# 3. Set start command: uvicorn main:app --host 0.0.0.0 --port $PORT
# 4. Add env vars: SECRET_KEY, GEMINI_API_KEY, FRONTEND_URL
```

### Backend → Render

```bash
# render.yaml is included
# Connect repo → New Web Service → Python → Build: pip install -r requirements.txt
# Start: uvicorn main:app --host 0.0.0.0 --port $PORT
```

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current user info |

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile/` | Get profile |
| PATCH | `/api/profile/` | Update profile |
| POST | `/api/profile/avatar` | Upload avatar |
| DELETE | `/api/profile/avatar` | Delete avatar |
| POST | `/api/profile/resume` | Upload resume (enables AI) |
| DELETE | `/api/profile/resume` | Delete resume |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/jobs/scrape` | Scrape jobs from all platforms |
| POST | `/api/jobs/apply` | Record job application |
| GET | `/api/jobs/applications` | List applications (paginated) |
| PATCH | `/api/jobs/applications/{id}` | Update application status |
| DELETE | `/api/jobs/applications/{id}` | Delete application |
| POST | `/api/jobs/bookmark` | Bookmark a job |
| GET | `/api/jobs/bookmarks` | List bookmarks |
| DELETE | `/api/jobs/bookmark/{id}` | Remove bookmark |
| GET | `/api/jobs/stats` | Dashboard statistics |

---

## 🗄️ Database Schema

```sql
users
  id, full_name, email, hashed_password, phone, location, bio,
  avatar_url, resume_text, is_active, created_at, updated_at

job_applications
  id, user_id → users, job_title, company, location, platform,
  job_url, status, applied_at, notes

bookmarked_jobs
  id, user_id → users, job_title, company, location, platform,
  job_url, description, ai_summary, ai_match_score, bookmarked_at
```

---

## 🤖 AI Integration (Gemini)

Set `GEMINI_API_KEY` in `.env` to enable:

1. **Resume Matching** — Upload resume in Profile → every job search returns `ai_match_score` (0-100) and `ai_match_reason`
2. **Job Summaries** — Bookmark a job with description → Gemini generates bullet-point summary
3. **Keyword Suggestions** — After searching, AI recommends better keywords based on your resume
4. **Smart Filter** — Enter natural language preference in search → Gemini filters results

All AI features gracefully degrade to standard behavior if the API key is not set.

---

## 📁 Project Structure

```
hirekarma/
├── backend/
│   ├── main.py              # FastAPI app entry
│   ├── config.py            # Settings (pydantic-settings)
│   ├── database.py          # SQLAlchemy async setup
│   ├── models/
│   │   ├── user.py          # User model
│   │   └── job.py           # JobApplication, BookmarkedJob
│   ├── routers/
│   │   ├── auth.py          # Signup, login, /me
│   │   ├── profile.py       # Profile CRUD, avatar, resume
│   │   └── jobs.py          # Scrape, apply, bookmarks, stats
│   ├── services/
│   │   ├── scraper.py       # Multi-platform scraper (httpx + BS4)
│   │   └── ai_service.py    # Gemini AI integration
│   ├── utils/
│   │   └── auth.py          # JWT utils, password hashing
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── api/client.ts    # Axios API client
    │   ├── stores/          # Zustand state
    │   ├── components/
    │   │   ├── layout/      # Sidebar, MobileNav, AppLayout
    │   │   └── ui/          # JobCard
    │   └── pages/
    │       ├── LoginPage.tsx
    │       ├── SignupPage.tsx
    │       ├── DashboardPage.tsx
    │       ├── ScrapePage.tsx
    │       ├── ApplicationsPage.tsx
    │       ├── BookmarksPage.tsx
    │       └── ProfilePage.tsx
    └── package.json
```

---

## 🔒 Security Practices

- Passwords hashed with bcrypt (passlib)
- JWT tokens with configurable expiry (default 7 days)
- HTTPBearer token extraction
- CORS configured for specific origins
- File upload type validation and size limits
- SQL injection prevention via SQLAlchemy ORM
- No plaintext secrets in code (environment variables)

---

## 📝 Git Commit Convention

```
feat: add AI resume matching with Gemini
fix: handle LinkedIn scrape CAPTCHA fallback
refactor: extract scraper into service layer
docs: update deployment instructions
```

---

## 👤 Author

Built for the HireKarma Pvt. Ltd. SDE-1 Assessment  
Stack: React · TypeScript · FastAPI · SQLite · Gemini AI
