# PulseBoard

A real-time project and task management platform — a bit like a lightweight Trello. You sign up, create projects, add tasks, assign them to people, and move them across **To do → In progress → Done**. When a teammate changes something, your board updates on its own without a refresh. There's also full-text task search and an AI-written summary that tells you where a project stands.

This is a personal project I'm actively building to get hands-on, production-style experience with **PostgreSQL, Redis, and Socket.io** in a real multi-service architecture, alongside my day-to-day MERN stack work. It has two parts that work together: a backend API and a frontend web app.

I'm building this in my spare time alongside full-time work, so it's an ongoing project — most of the core features are done and working, and I'm actively adding more. I've been upfront about what's still in progress near the end of this file.

> **Note to self before publishing:** redeploy frontend/backend under a fresh Vercel/Render project name before linking this publicly — current deployment URLs reference an earlier internal project name.

## Table of contents

- [What you can do](#what-you-can-do)
- [How it works](#how-it-works)
- [Tech used](#tech-used)
- [Folder structure](#folder-structure)
- [Running it on your machine](#running-it-on-your-machine)
- [Environment variables](#environment-variables)
- [The API](#the-api)
- [Real-time updates](#real-time-updates)
- [Search](#search)
- [AI summary](#ai-summary)
- [Tests](#tests)
- [Deployment](#deployment)
- [Current status](#current-status)
- [Roadmap](#roadmap)

## What you can do

Here's the full flow from a normal user's side:

- **Create an account and log in.** Your password is hashed, and after logging in you get a token that keeps you signed in.
- **Create projects.** Each project is a workspace with its own board.
- **Add members.** As the project owner, you can add other people to a project by their email so you can work together.
- **Add tasks.** A task has a title, an optional description, a priority (Low, Medium, High), an assignee, and a due date.
- **Move tasks.** Each task sits in one of three columns: To do, In progress, or Done. You move it by picking a new status on the card.
- **Watch it update live.** If someone else adds or moves a task in a project you're looking at, it shows up on your board straight away. No refresh needed.
- **Search your tasks.** Type a word and it finds matching tasks across all the projects you're part of.
- **Get an AI summary.** On any board you can click a button and get a short written summary of the project's current status.

## How it works

This is the simple version of what happens behind the scenes.

The **frontend** is the website you see and click on. It's a single-page app, which means the page never fully reloads while you use it. When you do something, like create a task, the frontend sends a request to the backend.

The **backend** is the brain. It receives those requests, checks that you're allowed to do what you're asking, saves things to the database, and sends an answer back.

The **database (PostgreSQL)** is where everything is stored for good: users, projects, tasks, and who belongs to which project.

**Redis** does three smaller jobs. It remembers AI summaries for a short while so we don't ask the AI the same thing twice, it keeps a count of requests so nobody can spam the API, and it helps pass real-time messages around.

**Socket.io** is what makes the board feel live. When a task changes, the backend sends a little message over a live connection to everyone looking at that project, and their boards update on their own.

**Groq** is the AI service that writes the project summaries.

Every write follows the same simple path: a request comes in, the backend checks your login, saves the change to the database, sends out a live update, and replies to you.

## Tech used

**Backend**

- Node.js with Express (written in TypeScript)
- PostgreSQL with Prisma (Prisma is the tool that talks to the database)
- Redis for caching, rate limiting, and live messaging
- Socket.io for real-time updates
- JWT for login tokens
- Groq (LLaMA model) for AI summaries

**Frontend**

- React with Vite (written in TypeScript)
- Tailwind CSS for styling
- Redux Toolkit and RTK Query for handling data and caching
- Socket.io client for live updates
- React Router for moving between pages

Both parts run in Docker, so they behave the same on any machine.

## Folder structure

```
.
├── backend/    # the API
└── frontend/   # the web app
```

Each folder has its own README with more detail. The backend also has a `docs/` folder with the architecture diagram, a Postman collection you can import to try the API, and the test report.

## Running it on your machine

The only thing you need installed is **Docker**. Docker sets up Postgres and Redis for you, so there's nothing else to install by hand.

**Step 1 — start the backend and the databases.**

```bash
cd backend
cp .env.example .env
docker compose up --build
```

This starts Postgres, Redis, and the API together in one go. The first time it builds the images, so give it a minute. When it's ready, the API is at `http://localhost:4000`. You can open `http://localhost:4000/api/docs` in your browser to see and try every endpoint.

**Step 2 — start the frontend** (open a second terminal).

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The app opens at `http://localhost:5173`. Open it, create an account, and you're in.

**To see the live updates working:** open the same project in two browser windows side by side, then move a task in one window. It moves in the other window right away.

If you'd rather run the backend without Docker while developing, you can start only the databases in Docker and run the API on your machine:

```bash
cd backend
docker compose up -d postgres redis
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## Environment variables

These are the settings the apps read on startup. There are example files (`.env.example`) in both folders, so you can copy them and fill in what you need.

**Backend**

- `PORT` — the port the API runs on. Default is `4000`.
- `DATABASE_URL` — where Postgres is. The default works with Docker.
- `REDIS_URL` — where Redis is. The default works with Docker.
- `JWT_SECRET` — a secret string used to sign login tokens. Change it for a real deploy.
- `JWT_EXPIRES_IN` — how long a login lasts. Default is `7d` (seven days).
- `GROQ_API_KEY` — your Groq key for AI summaries. Leave it empty and the app still runs (see the AI section below).
- `GROQ_MODEL` — which AI model to use.
- `CORS_ORIGIN` — which website is allowed to call the API. For a deploy, set this to your live frontend URL.

**Frontend**

- `VITE_API_URL` — the address of the backend. Default is `http://localhost:4000`. For a deploy, set this to your live backend URL.

## The API

Everything lives under `/api`. Most routes need you to be logged in (the frontend handles sending your token automatically).

**Auth**

- `POST /api/auth/register` — create an account
- `POST /api/auth/login` — log in
- `GET /api/auth/me` — get the logged-in user

**Projects**

- `GET /api/projects` — list your projects
- `POST /api/projects` — create a project
- `GET /api/projects/:id` — get one project and its members
- `PATCH /api/projects/:id` — update a project
- `DELETE /api/projects/:id` — delete a project (owner only)
- `POST /api/projects/:id/members` — add a member by email (owner only)

**Tasks**

- `GET /api/projects/:projectId/tasks` — list a project's tasks
- `POST /api/projects/:projectId/tasks` — create a task
- `PATCH /api/tasks/:id` — update a task (status, assignee, and so on)
- `DELETE /api/tasks/:id` — delete a task

**Search and AI**

- `GET /api/search?q=word` — search your tasks
- `POST /api/projects/:projectId/summary` — get an AI summary of a project

There's also `GET /health` to check the API is up, and `GET /api/docs` for the full interactive documentation.

## Real-time updates

This is the part I'm happiest with. When you open a project board, the app quietly opens a live connection to the backend and joins a "room" for that project. From then on, whenever any member creates, moves, or deletes a task, the backend sends a small message to everyone in that room, and their boards update on their own.

There's a small "Live" dot at the top of the board so you can tell the live connection is working. If the connection ever drops, the app still keeps the board correct by refetching after each change, so you never end up looking at stale data.

## Search

Search uses PostgreSQL's built-in full-text search. It looks through task titles and descriptions, only inside the projects you belong to, and orders the results so the closest matches come first.

## AI summary

The summary feature sends the project's task list to Groq and asks for a short status write-up. To keep it fast and avoid repeating work, the result is saved in Redis for about ten minutes, so asking again right away returns the saved one instantly.

One nice detail: if no Groq key is set, the app doesn't break. It falls back to a simple summary that counts how many tasks are in each column. That way the whole app runs out of the box, and you only add a key when you want real AI-written text.

## Tests

The backend has both unit tests and integration tests.

```bash
cd backend
npm test                # quick tests, no setup needed
npm run test:coverage   # full run (needs Postgres and Redis running)
```

The unit tests check the validation rules. The integration tests actually call the API end to end: register, log in, create a project, create and move a task, search for it, and confirm that someone who isn't a member is blocked.

## Deployment

The frontend is deployed on Vercel and the backend on Render. *(Update these links once redeployed under the project's own name.)*

- App: `<your-new-vercel-url>`
- API: `<your-new-render-url>`

The two are tied together by two settings: the frontend's `VITE_API_URL` points at the Render API, and the backend's `CORS_ORIGIN` is set to the Vercel app URL so the browser is allowed to talk to it.

A couple of things worth knowing about the free hosting:

- **The backend sleeps when it's idle.** On Render's free plan, the API spins down after about 15 minutes of no activity, and the next request takes 30 to 60 seconds to wake it back up. So the very first page load after a quiet period can hang for up to a minute, and then it's fast again. If you're showing this to someone live, open the API link a minute beforehand so it's already awake. The live updates also drop while the service is asleep and reconnect once it's back up.
- **The free database is temporary.** Render's free PostgreSQL expires about 30 days after it's created (with a short grace period before the data is removed). That's fine for a demo, but it isn't meant for long-term storage.

## Current status

All the main features are built and working:

- Sign up and log in, with hashed passwords and token-based sessions
- Create, view, update, and delete projects
- Add members to a project
- Create, assign, prioritise, move, and delete tasks
- A board with the three live columns
- Real-time updates over a live connection (Socket.io)
- Full-text task search (PostgreSQL)
- AI project summaries (with a working fallback when there's no AI key)
- Rate limiting and basic security headers on the API
- Interactive API docs and a Postman collection
- Unit and integration tests
- A responsive layout that works on phone and desktop
- Docker setup for the whole thing

## Roadmap

This is an ongoing project, and here's what I'm planning to add next:

- **Drag and drop for tasks.** Right now you move a task between columns using a dropdown on the card. Adding drag-and-drop (likely with `dnd-kit`) would make the board feel more native.
- **Notifications.** When you assign a task to someone, they see it on the board but don't get an alert. Planning a simple in-app + email notification on assignment.
- **Email invites for new users.** At the moment you can only add a member who has already signed up. Adding an email-invite flow for people without an account yet is next.
- **Scaling Socket.io across multiple instances.** Currently single-instance; adding the Redis adapter for Socket.io so real-time works correctly if the backend is ever scaled horizontally.
- **Role-based access control.** Right now it's just owner vs. member — planning finer-grained roles (e.g. admin, contributor, viewer) per project.
- **Activity log / audit trail.** A history of who changed what and when, per project.
- **File attachments on tasks.** Letting users attach files/images to a task.
- **CI/CD pipeline.** Adding GitHub Actions for running tests and auto-deploying on merge.
- **Wider test coverage.** Search and AI summary endpoints currently have lighter coverage than auth/tasks — bringing those up to the same bar.
- **Production-grade logging/observability.** Structured logging (Pino/Winston) and basic monitoring instead of console logs.