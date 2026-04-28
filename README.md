# Job-Ops 🚀

**AI-powered job search automation platform** — built for software, AI, data, and automation roles.

Discovers jobs, scores them against your profile, auto-tailors your resume per job, tracks applications, and assists with applying — all from a beautiful web dashboard.

## Features

- 🔍 **Job Discovery** — scan Greenhouse, Lever, Ashby, Wellfound, RemoteFront, and company pages
- 🧠 **AI Scoring** — Gemini Flash ranks jobs A–F against your skills and preferences
- 📄 **Auto Resume Tailoring** — generates one custom resume per shortlisted job (from your base profile)
- 📊 **Pipeline Dashboard** — track all applications, statuses, follow-ups
- 📨 **Outreach Drafts** — LinkedIn messages and emails drafted by AI
- 🤖 **Assisted Apply** — Playwright-based form-filler, you approve before submit
- 💰 **Cheap Model Routing** — Gemini 2.5 Flash-Lite for bulk tasks, Flash for reasoning

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Backend | FastAPI (Python) |
| AI | Gemini 2.5 Flash-Lite + Flash |
| Database | PostgreSQL (prod) / SQLite (local dev) |
| Resume PDF | Playwright HTML→PDF |
| Browser Automation | Playwright (assisted apply) |
| Deployment | Render / Google Cloud Run (free tier) |

## Project Structure

```
job-ops/
├── frontend/          # Next.js web app
│   ├── src/
│   │   ├── app/       # App router pages
│   │   ├── components/
│   │   └── lib/
│   └── ...
├── backend/           # FastAPI API
│   ├── app/
│   │   ├── api/       # Route handlers
│   │   ├── core/      # Config, DB, models
│   │   ├── services/  # AI, scanner, resume, apply
│   │   └── main.py
│   ├── requirements.txt
│   └── ...
├── docker-compose.yml
├── render.yaml
└── README.md
```

## Quick Start

### Local Development

```bash
# 1. Clone
git clone https://github.com/krish-gupta53/job-ops.git
cd job-ops

# 2. Backend setup
cd backend
cp .env.example .env        # Fill in your Gemini API key
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 3. Frontend setup (new terminal)
cd frontend
npm install
cp .env.local.example .env.local
npm run dev

# App runs at http://localhost:3000
```

### Docker (Recommended)

```bash
cp backend/.env.example backend/.env   # Fill in your keys
docker-compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
```

## Environment Variables

### Backend (`backend/.env`)

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Database
DATABASE_URL=sqlite:///./jobops.db       # local
# DATABASE_URL=postgresql://user:pass@host/db   # production

# App
SECRET_KEY=your_secret_key_here
FRONTEND_URL=http://localhost:3000

# Optional: for email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your_app_password
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Getting Your Gemini API Key (Free)

1. Go to [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy and paste into `backend/.env`

Free tier: **15 RPM, 1M tokens/day** — more than enough for daily job searching.

## Deployment

### Render (Easiest Free Option)

```bash
# Push to GitHub, then:
# 1. Go to render.com → New → Blueprint
# 2. Connect your repo
# 3. render.yaml is already configured
# 4. Add GEMINI_API_KEY in environment settings
```

### Google Cloud Run

```bash
# See docs/deploy-cloudrun.md for step-by-step
```

## Usage Walkthrough

1. **Setup Profile** → fill your roles, skills, resume, and preferences
2. **Configure Sources** → choose job boards and target companies
3. **Run Scan** → system finds and scores matching jobs
4. **Review Job Feed** → see A–F ranked jobs with match breakdown
5. **Generate Resumes** → one tailored resume PDF per shortlisted job
6. **Track Pipeline** → update statuses, add notes, set follow-up reminders
7. **Assisted Apply** → click Apply, Playwright fills forms, you approve

## License

MIT — free to use, fork, and modify.
