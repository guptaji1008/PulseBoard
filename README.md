# PulseBoard

PulseBoard is a real-time project and task management platform inspired by lightweight Kanban tools. Users can create projects, add members, assign tasks, move work across **Todo -> In Progress -> Done**, search tasks, get AI-generated project summaries, and receive email notifications for important project/task activity.

The project was built as a production-style full-stack application using **React, Node.js, PostgreSQL, Redis, Socket.io, BullMQ, Prisma, Docker, Brevo, and Groq AI**. It includes secure authentication, live multi-user boards, background jobs, transactional emails, API documentation, and deployment-ready configuration for a Vercel frontend and Render backend.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Authentication Flow](#authentication-flow)
- [Background Email Jobs](#background-email-jobs)
- [Real-Time Updates](#real-time-updates)
- [API Overview](#api-overview)
- [Search and AI Summary](#search-and-ai-summary)
- [Testing](#testing)
- [Deployment](#deployment)
- [Roadmap](#roadmap)

## Features

- **Full authentication flow**: register, email OTP verification, login, refresh token rotation, logout, forgot password, reset password, and `/auth/me`.
- **Secure cookies**: HttpOnly access/refresh cookies with production-ready `sameSite` and `secure` settings.
- **Socket authentication**: short-lived socket tokens for reliable Vercel-to-Render real-time connections.
- **Project management**: create, update, delete, and list projects.
- **Member management**: project owners can add members by email.
- **Task management**: create, assign, prioritize, update status, set due dates, and delete tasks.
- **Live Kanban board**: Socket.io updates all connected project members without page refreshes.
- **Transactional emails**: Brevo API sends OTP and password reset emails, while BullMQ + Redis jobs send project/task notification emails in the background.
- **Full-text search**: PostgreSQL search across tasks the user is allowed to access.
- **AI project summaries**: Groq LLaMA model summarizes project status, with Redis caching and fallback summaries.
- **API docs**: Swagger documentation is available at `/api/docs`.
- **Production deployment**: frontend on Vercel, backend on Render, Redis/PostgreSQL backing services.

## Architecture

PulseBoard is split into two apps:

- `frontend/`: React + Vite single-page application.
- `backend/`: Express + Prisma REST API with Socket.io and BullMQ workers.

High-level flow:

1. The frontend calls the REST API using RTK Query.
2. The backend validates auth, checks project membership, and writes data with Prisma.
3. PostgreSQL stores users, projects, members, tasks, OTPs, reset tokens, and refresh tokens.
4. Socket.io broadcasts task changes to everyone viewing the same project board.
5. Redis powers Socket.io pub/sub, API rate limiting, AI summary caching, and BullMQ email queues.
6. Brevo sends transactional emails over HTTPS, avoiding SMTP port issues on production hosting.
7. BullMQ processes project/task notification emails in the background so API requests stay fast.
8. Groq generates project summaries, with a local fallback if no API key is configured.

## Tech Stack

**Frontend**

- React 19
- TypeScript
- Vite
- Redux Toolkit + RTK Query
- React Router
- Tailwind CSS
- Socket.io Client
- Lucide React

**Backend**

- Node.js
- Express
- TypeScript
- PostgreSQL
- Prisma
- Redis + ioredis
- Socket.io + Redis adapter
- BullMQ
- Nodemailer fallback
- Brevo Transactional Email API
- JWT
- Zod validation
- Swagger/OpenAPI
- Jest + Supertest

**DevOps / Deployment**

- Docker / Docker Compose
- Vercel frontend
- Render backend
- Hosted PostgreSQL and Redis

## Folder Structure

```text
.
├── backend/
│   ├── prisma/              # Prisma schema and migrations
│   ├── src/
│   │   ├── config/          # env, Prisma, Redis config
│   │   ├── docs/            # Swagger docs
│   │   ├── middleware/      # auth, validation, rate limit, error handler
│   │   ├── modules/         # auth, projects, tasks, search, AI, notifications
│   │   └── sockets/         # Socket.io server setup
│   └── tests/               # unit and integration tests
├── frontend/
│   └── src/
│       ├── app/             # Redux store/hooks
│       ├── components/      # reusable UI components
│       ├── features/        # auth slice
│       ├── lib/             # config/socket helpers
│       ├── pages/           # app pages
│       └── services/        # RTK Query API client
└── README.md
```

## Local Setup

### Option 1: Docker for databases, local dev servers

This is the best setup for development.

```powershell
cd backend
copy .env.example .env
docker-compose up -d postgres redis
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

In a second terminal:

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

Open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:4000/health`
- Swagger docs: `http://localhost:4000/api/docs`

### Option 2: Run backend stack with Docker

```powershell
cd backend
copy .env.example .env
docker-compose up --build
```

Then run the frontend separately:

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

## Environment Variables

### Backend

```env
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/taskdb"
REDIS_URL="redis://localhost:6380"
JWT_SECRET="change_me_in_production"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="7d"
APP_URL="http://localhost:5173"
BREVO_API_KEY=""
MAIL_FROM="PulseBoard <no-reply@pulseboard.local>"
SMTP_HOST=""
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASS=""
GROQ_API_KEY=""
GROQ_MODEL="llama-3.3-70b-versatile"
CORS_ORIGIN="*"
```

Important production values:

- `NODE_ENV=production`
- `JWT_SECRET`: strong secret, not the dev value.
- `APP_URL`: deployed frontend URL.
- `CORS_ORIGIN`: deployed frontend URL, for example `https://your-app.vercel.app`.
- `REDIS_URL`: hosted Redis URL. `rediss://` URLs are supported.
- `BREVO_API_KEY`: Brevo API key for production email delivery. It should start with `xkeysib-`.
- `MAIL_FROM`: a sender email verified in Brevo, for example `PulseBoard <name@example.com>`.
- `SMTP_*`: optional SMTP fallback values. Brevo API is preferred for Render because SMTP ports can time out.
- `GROQ_API_KEY`: optional, but needed for AI-written summaries.

### Frontend

```env
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

For production:

```env
VITE_API_URL=/api
VITE_SOCKET_URL=https://your-render-backend.onrender.com
```

In production, the frontend uses a Vercel rewrite from `/api/*` to the Render backend. Keeping `VITE_API_URL=/api` makes auth requests same-origin from the browser's point of view, which helps HttpOnly cookies work reliably after login.

## Authentication Flow

PulseBoard uses a full auth system:

1. **Register**: user creates an account with name, email, and password.
2. **Email OTP verification**: backend sends a one-time code through Brevo.
3. **Login**: password is checked with bcrypt, then access and refresh tokens are issued.
4. **HttpOnly cookies**: tokens are stored in secure cookies instead of localStorage.
5. **Refresh token rotation**: `/auth/refresh` issues fresh tokens and stores refresh token state.
6. **Logout**: refresh token is revoked and auth cookies are cleared.
7. **Forgot/reset password**: backend creates a secure reset token and sends a reset link by email.
8. **Socket token**: `/auth/socket-token` returns a short-lived JWT used by Socket.io in production cross-origin deployments.

## Background Email Jobs

Email notifications are handled with **BullMQ** and **Redis** so emails do not slow down API responses.

Jobs are enqueued when:

- a project is created,
- a member is added to a project,
- a task is assigned,
- a task status changes.

The worker starts with the backend process and processes the `email-notifications` queue. If Brevo or SMTP is not configured, the email service logs what it would send, which keeps local development easy.

## Real-Time Updates

Socket.io powers live board updates.

- When a user opens a project board, the client connects to Socket.io and joins a project room.
- When a task is created, updated, or deleted, the backend emits an event to that room.
- The frontend updates RTK Query task cache immediately, so all connected users see the latest board state.
- Redis adapter support allows Socket.io events to work correctly across multiple backend instances.

The board shows a `Live` / `Offline` indicator so users can see socket connection state.

## API Overview

All API routes are under `/api`.

### Auth

- `POST /api/auth/register`
- `POST /api/auth/verify-email`
- `POST /api/auth/resend-verification`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `GET /api/auth/socket-token`

### Projects

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`
- `POST /api/projects/:id/members`

### Tasks

- `GET /api/projects/:projectId/tasks`
- `POST /api/projects/:projectId/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`

### Search and AI

- `GET /api/search?q=keyword`
- `POST /api/projects/:projectId/summary`

Utility:

- `GET /health`
- `GET /api/docs`
- `GET /api/docs.json`

## Search and AI Summary

Search uses PostgreSQL full-text search over task titles and descriptions, scoped to projects where the logged-in user is a member.

AI summaries use Groq with the configured `GROQ_MODEL`. Results are cached in Redis for faster repeated reads. If `GROQ_API_KEY` is missing, the app returns a deterministic fallback summary based on task counts by status.

## Testing

Backend tests:

```powershell
cd backend
npm test
npm run test:coverage
```

Notes:

- Schema/unit tests can run without external services.
- Integration tests need PostgreSQL running with the configured `DATABASE_URL`.
- Redis is also expected by the app runtime for sockets, rate limiting, cache, and queues.

Frontend build check:

```powershell
cd frontend
npm run build
```

Backend build check:

```powershell
cd backend
npm run build
```

## Deployment

The project is designed for:

- **Frontend**: Vercel
- **Backend**: Render
- **Database**: PostgreSQL
- **Queue/cache/realtime broker**: Redis

Production environment checklist:

**Vercel**

```env
VITE_API_URL=/api
VITE_SOCKET_URL=https://your-render-backend.onrender.com
```

The frontend should include a Vercel rewrite similar to:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-render-backend.onrender.com/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Render**

```env
NODE_ENV=production
CORS_ORIGIN=https://your-vercel-app.vercel.app
APP_URL=https://your-vercel-app.vercel.app
DATABASE_URL=your_production_postgres_url
REDIS_URL=your_production_redis_url
JWT_SECRET=your_strong_secret
BREVO_API_KEY=your_brevo_api_key
MAIL_FROM="PulseBoard <your_verified_brevo_sender@example.com>"
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.3-70b-versatile
```

Brevo requirements:

- Use an API key from **SMTP & API -> API Keys**, not an SMTP key. API keys usually start with `xkeysib-`.
- `MAIL_FROM` must be a verified sender in Brevo.
- If Brevo blocks an unrecognized IP, add the Render outbound IP shown in the Render error log under Brevo authorized IPs.

For production cookies to work, the backend must run over HTTPS and `NODE_ENV` should be `production`. If the frontend calls the backend through Vercel's `/api` rewrite, the browser treats auth requests as same-origin and sends the HttpOnly cookies more reliably.

## Roadmap

- Drag-and-drop task movement with `dnd-kit`.
- Invite flow for users who do not have an account yet.
- More granular project roles such as admin, contributor, and viewer.
- Activity log / audit trail for project and task changes.
- File attachments on tasks.
- More integration test coverage for search, AI, and notifications.
- Structured logging and monitoring for production observability.
