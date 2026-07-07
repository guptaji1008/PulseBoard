# PulseBoard

PulseBoard is a real-time project and task management app, similar to a simple Kanban tool. Users can sign up, create projects, add team members, create tasks, and move tasks across three stages: **Todo → In Progress → Done**. The app also has task search, AI-generated project summaries, and email notifications for important activity.

This is a full-stack project built with **React, Node.js, PostgreSQL, Redis, Socket.io, BullMQ, Prisma, Docker, Brevo, and Groq AI**. It has secure login, a live multi-user board, background email jobs, API docs, and is ready to deploy (frontend on Vercel, backend on Render).

## Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Running It Locally](#running-it-locally)
- [Environment Variables](#environment-variables)
- [Login and Auth](#login-and-auth)
- [Background Emails](#background-emails)
- [Live Board Updates](#live-board-updates)
- [API Routes](#api-routes)
- [Search and AI Summary](#search-and-ai-summary)
- [Testing](#testing)
- [Deployment](#deployment)
- [What's Next](#whats-next)

## Features

- **Full login system**: sign up, verify email with an OTP code, log in, log out, forgot/reset password, and a `/me` route to get the current user.
- **Safe cookies**: login tokens are stored in HttpOnly cookies (not localStorage), with secure settings for production.
- **Working sockets in production**: a short-lived socket token is used so real-time updates work reliably between Vercel (frontend) and Render (backend).
- **Projects**: create, view, update, and delete projects.
- **Team members**: project owners can add members by email.
- **Tasks**: create tasks, assign them to a member, set priority and due date, change status, and delete them.
- **Live Kanban board**: when one member updates a task, everyone else looking at the same project sees it update instantly, no refresh needed.
- **Emails**: OTP and password reset emails go out through the Brevo API. Project/task notification emails (like "you were assigned a task") are sent in the background using BullMQ and Redis, so the app stays fast.
- **Search**: full-text search across tasks, using PostgreSQL.
- **AI summaries**: a Groq LLaMA model can summarize a project's status. Results are cached in Redis, and there's a simple fallback summary if no AI key is set.
- **API docs**: available at `/api/docs` (Swagger).
- **Ready for production**: frontend on Vercel, backend on Render, with hosted PostgreSQL and Redis.

## How It Works

The project has two apps:

- `frontend/` – a React + Vite single-page app.
- `backend/` – an Express + Prisma REST API, with Socket.io and BullMQ workers.

Here's the basic flow, step by step:

1. The frontend sends requests to the backend using RTK Query.
2. The backend checks login and project access, then reads/writes data through Prisma.
3. PostgreSQL stores users, projects, members, tasks, OTPs, reset tokens, and refresh tokens.
4. Socket.io sends task changes to everyone viewing the same project board.
5. Redis is used in four places: Socket.io pub/sub, rate limiting, AI summary caching, and BullMQ queues.
6. Brevo sends OTP and password reset emails over HTTPS (this avoids SMTP problems on Render).
7. BullMQ sends project/task notification emails in the background, so API responses stay quick.
8. Groq generates project summaries. If no API key is set, the app uses a simple fallback summary instead.

## Tech Stack

**Frontend**

- React 19 + TypeScript
- Vite
- Redux Toolkit + RTK Query
- React Router
- Tailwind CSS
- Socket.io Client
- Lucide React (icons)

**Backend**

- Node.js + Express + TypeScript
- PostgreSQL + Prisma
- Redis (via ioredis)
- Socket.io + Redis adapter
- BullMQ (background jobs)
- Brevo Transactional Email API (with Nodemailer as a fallback)
- JWT for auth, Zod for validation
- Swagger/OpenAPI for docs
- Jest + Supertest for tests

**DevOps**

- Docker / Docker Compose
- Vercel (frontend)
- Render (backend)
- Hosted PostgreSQL and Redis

## Folder Structure

```text
.
├── backend/
│   ├── prisma/              # Database schema and migrations
│   ├── src/
│   │   ├── config/          # env, Prisma, and Redis setup
│   │   ├── docs/            # Swagger docs
│   │   ├── middleware/      # auth, validation, rate limiting, error handling
│   │   ├── modules/         # auth, projects, tasks, search, AI, notifications
│   │   └── sockets/         # Socket.io server setup
│   └── tests/               # unit and integration tests
├── frontend/
│   └── src/
│       ├── app/             # Redux store
│       ├── components/      # reusable UI pieces
│       ├── features/        # auth state (Redux slice)
│       ├── lib/             # config and socket helpers
│       ├── pages/           # app screens
│       └── services/        # API client (RTK Query)
└── README.md
```

## Running It Locally

### Option 1: Docker for the databases, run the apps yourself (recommended)

```powershell
cd backend
copy .env.example .env
docker-compose up -d postgres redis
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Open a second terminal for the frontend:

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

Then open:

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:4000/health`
- API docs: `http://localhost:4000/api/docs`

### Option 2: Run the whole backend with Docker

```powershell
cd backend
copy .env.example .env
docker-compose up --build
```

Then run the frontend the same way as above.

## Environment Variables

### Backend (`backend/.env`)

```env
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/taskdb"
REDIS_URL="redis://localhost:6380"
JWT_SECRET="change_me_in_production"
JWT_EXPIRES_IN="15m"
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

A few notes for production:

- `NODE_ENV` should be `production`.
- `JWT_SECRET` must be a strong, private value — not the dev default.
- `APP_URL` and `CORS_ORIGIN` should be your live frontend URL, e.g. `https://your-app.vercel.app`.
- `REDIS_URL` should point to your hosted Redis. `rediss://` (with SSL) is supported.
- `BREVO_API_KEY` should be a real API key, not an SMTP key — it usually starts with `xkeysib-`.
- `MAIL_FROM` must use a sender email that's verified in your Brevo account.
- `SMTP_*` values are only a backup option. Brevo's API is preferred on Render, since SMTP ports can be blocked or time out there.
- `GROQ_API_KEY` is optional. Without it, AI summaries fall back to a simple, non-AI summary.

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

In production:

```env
VITE_API_URL=/api
VITE_SOCKET_URL=https://your-render-backend.onrender.com
```

Keeping `VITE_API_URL=/api` in production matters: it means the browser treats API calls as "same origin" (thanks to a Vercel rewrite), which makes login cookies work reliably.

## Login and Auth

Here's how login works, step by step:

1. **Register** – user signs up with name, email, and password.
2. **Verify email** – backend sends a one-time code (OTP) through Brevo.
3. **Login** – password is checked with bcrypt, then the backend issues an access token and a refresh token.
4. **HttpOnly cookies** – both tokens are stored in secure cookies instead of localStorage, so they can't be read by JavaScript in the browser.
5. **Refresh** – `/auth/refresh` gives out new tokens when the old access token expires.
6. **Logout** – the refresh token is revoked and cookies are cleared.
7. **Forgot/reset password** – backend creates a secure, one-time reset token and emails a reset link.
8. **Socket token** – `/auth/socket-token` gives a short-lived token that the frontend uses just for connecting to Socket.io. This is needed because the frontend and backend are on different domains in production.

## Background Emails

Notification emails are sent using **BullMQ** and **Redis**, so sending an email never slows down an API response.

An email job gets queued when:

- a new project is created,
- a member is added to a project,
- a task is assigned to someone,
- a task's status changes.

The background worker runs inside the same backend process and picks up jobs from the `email-notifications` queue. If Brevo or SMTP isn't set up (e.g. during local development), the email service just logs what it would have sent, instead of failing.

## Live Board Updates

Socket.io keeps the Kanban board in sync across users in real time:

- When someone opens a project board, their browser connects to Socket.io and joins a "room" for that project.
- When a task is created, updated, or deleted, the backend sends an event to everyone in that room.
- The frontend updates its task list right away, so every connected user sees the change without refreshing.
- A Redis adapter makes sure this still works correctly even if the backend is running as more than one instance.

The board also shows a small `Live` / `Offline` indicator, so users can tell if their real-time connection is working.

## API Routes

All routes start with `/api`.

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

### Other

- `GET /health` – simple health check
- `GET /api/docs` – Swagger UI
- `GET /api/docs.json` – raw OpenAPI spec

## Search and AI Summary

**Search** uses PostgreSQL's full-text search to look through task titles and descriptions. It only searches tasks in projects the logged-in user is actually a member of.

**AI summaries** use Groq, with whichever model is set in `GROQ_MODEL`. Each summary is cached in Redis so repeat requests are fast. If `GROQ_API_KEY` isn't set, the app still returns a summary — just a simple one built from task counts by status, instead of an AI-written one.

## Testing

Run backend tests:

```powershell
cd backend
npm test
npm run test:coverage
```

Good to know:

- Some tests (schema/validation tests) don't need any external service.
- Integration tests need PostgreSQL running, matching your `DATABASE_URL`.
- The app also expects Redis to be available at runtime, for sockets, rate limiting, caching, and queues.

Current test suites cover: input validation, register/login/duplicate-email/auth-guard flows, and project/task creation with status updates and search.

Check that the frontend and backend both build cleanly:

```powershell
cd frontend
npm run build
```

```powershell
cd backend
npm run build
```

## Deployment

This project is set up to deploy as:

- **Frontend** → Vercel
- **Backend** → Render
- **Database** → PostgreSQL
- **Queue / cache / real-time broker** → Redis

### Vercel (frontend) environment variables

```env
VITE_API_URL=/api
VITE_SOCKET_URL=https://your-render-backend.onrender.com
```

The frontend should also have a Vercel rewrite, something like this:

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

### Render (backend) environment variables

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

### Brevo setup notes

- Use an API key from **SMTP & API → API Keys**, not an SMTP key. Real API keys usually start with `xkeysib-`.
- `MAIL_FROM` must be a sender address that's verified inside Brevo.
- If Brevo blocks the server's IP, check the Render error logs for the outbound IP and add it to Brevo's authorized IPs list.

For login cookies to work correctly in production, the backend must run over HTTPS, and `NODE_ENV` must be `production`. Routing frontend API calls through the Vercel `/api` rewrite (instead of calling Render directly) makes the browser treat these as same-origin requests, which is what makes the HttpOnly cookies reliable.

## What's Next

- Drag-and-drop task movement (likely using `dnd-kit`).
- Invite flow for people who don't have an account yet.
- More project roles beyond owner/member — like admin, contributor, and viewer.
- An activity log / audit trail for project and task changes.
- File attachments on tasks.
- More integration tests, especially for search, AI, and notifications.
- Structured logging and monitoring for production.