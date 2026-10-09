# Amazon Route 53 Clone

A functional clone of the AWS Route 53 console: hosted zone and DNS record management backed by a real API and persistent storage. It recreates the Route 53 user experience and workflows; it does **not** serve actual DNS.

| Layer    | Technology                                             |
| -------- | ------------------------------------------------------ |
| Frontend | Next.js 16 (App Router), TypeScript, Cloudscape Design System, TanStack Query |
| Backend  | FastAPI, SQLAlchemy 2, Pydantic v2                     |
| Database | SQLite                                                 |

## Status

| Area                                   | State       |
| -------------------------------------- | ----------- |
| Mocked auth (login / logout / session) | Done        |
| Database models and seed data          | Done        |
| Hosted zones CRUD + search             | Planned     |
| DNS records CRUD + search + validation | Planned     |
| Route 53 console chrome (nav, sidebar) | Planned     |
| "Coming soon" placeholder sections     | Planned     |
| Bonus: BIND import/export, dark mode, bulk ops, shortcuts | Planned |

## Repository layout

```
backend/    FastAPI service (API, models, seed data, tests)
frontend/   Next.js application (UI)
```

## Setup

Prerequisites: Python 3.11+ and Node.js 20+.

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate      macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                   # optional; defaults work for local dev
uvicorn app.main:app --reload --port 8000
```

On startup the app creates the SQLite file (`route53.db`) and seeds a demo user and sample hosted zones. Seeding is idempotent. Interactive API docs are served at <http://localhost:8000/docs>.

Run the tests:

```bash
python -m pytest
```

### Frontend

```bash
cd frontend
npm install
npm run dev                            # http://localhost:3000
```

The frontend proxies `/api/*` to the backend (`BACKEND_URL`, default `http://127.0.0.1:8000`) so the session cookie stays same-origin.

### Demo credentials

`admin` / `admin123`

## Architecture

```
Browser ──> Next.js (UI, port 3000)
              │  rewrites /api/* (same-origin cookies)
              ▼
            FastAPI (port 8000)
              routers  →  services  →  SQLAlchemy models  →  SQLite
```

- **routers/** – thin HTTP layer: parse requests, call services, shape responses.
- **services/** – business logic (authentication, zone defaults such as the NS/SOA records Route 53 creates automatically, name normalization).
- **models/** – SQLAlchemy ORM tables. **schemas/** – Pydantic request/response models.
- **core/** – configuration (env driven), DB engine/session, password hashing.
- **Auth** – mocked IAM sign-in. Credentials are checked against a `users` table (PBKDF2 hashed); a random session token is stored in `sessions` and sent as an `HttpOnly` cookie. Every non-auth route depends on `get_current_user`.
- **Frontend** – an `AuthProvider` restores the session via `/api/auth/me` on load; an `AuthGuard` redirects unauthenticated users to `/login`. UI is built with Cloudscape components, the design system the real AWS console uses, to match its look and feel.

## Database schema

```
users(id PK, username UNIQUE, password_hash, account_id, created_at)

sessions(token PK, user_id FK→users ON DELETE CASCADE, expires_at, created_at)

hosted_zones(id PK "Z…", name, comment, is_private, vpc_region, vpc_id, created_at,
             UNIQUE(name, is_private))

zone_tags(id PK, zone_id FK→hosted_zones ON DELETE CASCADE, key, value)

dns_records(id PK, zone_id FK→hosted_zones ON DELETE CASCADE, name, type, ttl,
            value (one value per line), routing_policy, set_identifier, alias_target,
            created_at, updated_at,
            UNIQUE(zone_id, name, type, set_identifier))
```

Names are stored lower-cased as fully qualified names with a trailing dot. Foreign keys are enforced (`PRAGMA foreign_keys=ON`), so deleting a hosted zone removes its records and tags.

## API overview

Base path: `/api`. All routes except `/auth/login` and `/health` require a valid session cookie.

| Method | Path            | Description                         | Status  |
| ------ | --------------- | ----------------------------------- | ------- |
| GET    | `/health`       | Liveness check                      | Done    |
| POST   | `/auth/login`   | Sign in, sets session cookie        | Done    |
| POST   | `/auth/logout`  | Sign out, clears cookie             | Done    |
| GET    | `/auth/me`      | Current user                        | Done    |
| GET/POST | `/hosted-zones` | List (search, filter, paginate) / create | Planned |
| GET/PATCH/DELETE | `/hosted-zones/{id}` | Read / edit / delete a zone | Planned |
| GET/POST | `/hosted-zones/{id}/records` | List (search, filter, paginate) / create | Planned |
| PUT/DELETE | `/hosted-zones/{id}/records/{record_id}` | Edit / delete a record | Planned |
| POST   | `/hosted-zones/{id}/import` | Import BIND zone file (bonus) | Planned |
| GET    | `/hosted-zones/{id}/export` | Export as JSON or BIND (bonus) | Planned |

## Limitations

This is a UI/UX clone. No DNS queries are answered, and IAM, billing, organizations and other AWS services are mocked.
