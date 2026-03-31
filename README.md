# AI DevOps Auto-Pilot

> AI-powered deployment platform: Repo → Deploy → Public URL → Logs → AI Fix

A production-ready SaaS platform that automates the entire DevOps lifecycle.
Upload a GitHub repo, and the system auto-detects the stack, generates a Dockerfile,
builds a Docker image, runs the container, assigns a public URL, and provides
AI-powered error analysis when things go wrong.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         Nginx Reverse Proxy                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────────────┐ │
│  │ Frontend  │  │  Backend │  │  Deployed User Containers        │ │
│  │ :3000     │  │  :8000   │  │  :9000-9500 (dynamic)            │ │
│  └──────────┘  └────┬─────┘  └──────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
   ┌──────┴──┐  ┌─────┴────┐  ┌───┴────────┐
   │PostgreSQL│  │  Redis   │  │Celery      │
   │  :5432   │  │  :6379   │  │Workers     │
   └──────────┘  └──────────┘  └────────────┘
```

## Tech Stack

### Backend
- **FastAPI** — Async Python web framework
- **PostgreSQL** — Primary database (SQLAlchemy async ORM)
- **Redis** — Caching, Celery broker, port allocation
- **Celery** — Background job processing for deployments
- **Docker SDK** — Container lifecycle management
- **Nginx** — Dynamic reverse proxy configuration

### Frontend
- **Next.js 15** — React framework with App Router
- **TypeScript** — Type safety
- **Tailwind CSS** — Utility-first styling
- **React Query** — Server state management
- **Framer Motion** — Animations
- **Lucide React** — Icon library

### AI Module
- **OpenAI-compatible API** — LLM-powered log analysis
- **Rule-based fallback** — Works without API key
- **Command validation** — Safety checks before applying fixes

---

## Features

- **JWT Authentication** — Secure registration/login with bcrypt
- **Project Management** — CRUD with ownership enforcement
- **Automatic Stack Detection** — Node.js, Python, Go, Rust, Ruby, PHP, Java
- **Dockerfile Generation** — Optimized, multi-stage, non-root builds
- **Container Deployment** — Resource-limited (512MB RAM, 0.5 CPU)
- **Dynamic Port Allocation** — Redis-backed atomic port assignment
- **Nginx Reverse Proxy** — Auto-generated configs with safe reload
- **Real-time Logs** — Live polling from containers
- **AI Error Analysis** — Root cause identification + fix suggestions
- **Retry Mechanism** — Automatic retry with exponential backoff

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Git

### 1. Clone and Start

```bash
git clone <repo-url> && cd ai-devops-autopilot

# Start all services
docker compose up -d --build
```

### 2. Access

| Service   | URL                           |
|-----------|-------------------------------|
| Frontend  | http://localhost:3000          |
| Backend   | http://localhost:8000          |
| API Docs  | http://localhost:8000/docs     |
| ReDoc     | http://localhost:8000/redoc    |

### 3. First Deployment

1. Register an account at http://localhost:3000/register
2. Create a new project with a GitHub repo URL
3. Click "Deploy"
4. Watch real-time logs
5. Access your deployed app via the assigned URL

---

## Local Development (Without Docker)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment config
cp .env.example .env
# Edit .env with your settings

# Start PostgreSQL and Redis (required)
# Option A: Use Docker for just the databases
docker run -d --name autopilot-pg -p 5432:5432 \
  -e POSTGRES_DB=autopilot -e POSTGRES_USER=autopilot \
  -e POSTGRES_PASSWORD=autopilot postgres:16-alpine

docker run -d --name autopilot-redis -p 6379:6379 redis:7-alpine

# Start the API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# In a separate terminal, start the Celery worker
celery -A app.celery_worker.celery_app worker --loglevel=info
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

---

## API Reference

### Authentication
| Method | Endpoint           | Description        |
|--------|--------------------|--------------------|
| POST   | /api/v1/auth/register | Register user    |
| POST   | /api/v1/auth/login    | Login            |
| GET    | /api/v1/auth/me       | Get profile      |

### Projects
| Method | Endpoint                  | Description         |
|--------|---------------------------|---------------------|
| POST   | /api/v1/projects          | Create project      |
| GET    | /api/v1/projects          | List projects       |
| GET    | /api/v1/projects/{id}     | Get project         |
| DELETE | /api/v1/projects/{id}     | Delete project      |

### Deployments
| Method | Endpoint                          | Description           |
|--------|-----------------------------------|-----------------------|
| POST   | /api/v1/deploy                    | Trigger deployment    |
| GET    | /api/v1/deploy/{id}               | Get status            |
| GET    | /api/v1/deploy/{id}/logs          | Get logs              |
| POST   | /api/v1/deploy/{id}/stop          | Stop deployment       |
| GET    | /api/v1/deploy/project/{id}       | List by project       |

### AI Analysis
| Method | Endpoint                          | Description           |
|--------|-----------------------------------|-----------------------|
| POST   | /api/v1/ai/analyze                | Analyze logs          |
| GET    | /api/v1/ai/suggestions/{dep_id}   | Get suggestions       |
| POST   | /api/v1/ai/validate-fix           | Validate commands     |

---

## Project Structure

```
ai-devops-autopilot/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Settings (env vars)
│   │   ├── database.py          # SQLAlchemy setup
│   │   ├── celery_worker.py     # Celery tasks
│   │   ├── models/              # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── deployment.py
│   │   │   ├── log.py
│   │   │   └── ai_suggestion.py
│   │   ├── schemas/             # Pydantic schemas
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── deployment.py
│   │   │   └── ai_suggestion.py
│   │   ├── routes/              # API endpoints
│   │   │   ├── auth.py
│   │   │   ├── projects.py
│   │   │   ├── deploy.py
│   │   │   └── ai.py
│   │   └── services/            # Business logic
│   │       ├── security.py
│   │       ├── auth_service.py
│   │       ├── project_service.py
│   │       ├── deployment_engine.py
│   │       ├── stack_detector.py
│   │       ├── dockerfile_generator.py
│   │       ├── port_allocator.py
│   │       ├── nginx_manager.py
│   │       └── ai_analyzer.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js pages
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── dashboard/
│   │   │   └── projects/
│   │   ├── components/          # UI components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── LogViewer.tsx
│   │   │   └── AIDebugPanel.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   └── lib/
│   │       ├── api.ts
│   │       └── types.ts
│   ├── Dockerfile
│   └── .env.local
├── nginx/
│   ├── nginx.conf
│   └── default.conf
└── docker-compose.yml
```

---

## Environment Variables

### Backend (.env)
| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL async connection | postgresql+asyncpg://... |
| REDIS_URL | Redis connection | redis://localhost:6379/0 |
| JWT_SECRET_KEY | JWT signing key | (change in production!) |
| CONTAINER_MEMORY_LIMIT | Max memory per container | 512m |
| CONTAINER_CPU_LIMIT | Max CPU per container | 0.5 |
| AI_API_KEY | OpenAI API key (optional) | (empty = rule-based) |
| BASE_DOMAIN | Domain for subdomains | localhost |

### Frontend (.env.local)
| Variable | Description | Default |
|----------|-------------|---------|
| NEXT_PUBLIC_API_URL | Backend API URL | http://localhost:8000/api/v1 |

---

## Security

- **JWT Tokens** — Short-lived access + long-lived refresh tokens
- **Bcrypt** — Password hashing with salt
- **Non-root Containers** — All generated Dockerfiles use non-root users
- **Resource Limits** — CPU and memory limits on all containers
- **Input Validation** — Pydantic schemas with strict constraints
- **CORS** — Configurable origin whitelist
- **Rate Limiting** — Per-IP rate limiting via SlowAPI
- **Command Validation** — AI fix commands checked for dangerous patterns
- **Docker Isolation** — Containers run in isolated network

---

## License

MIT
