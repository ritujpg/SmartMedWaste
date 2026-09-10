# SmartMedWaste Backend

FastAPI backend for healthcare waste segregation, collection operations, chain-of-custody tracking, alerts, compliance analytics, and dashboard data.

## Architecture

- `app/core`: settings, async SQLAlchemy sessions, JWT security, and authorization dependencies.
- `app/models`: UUID-based SQLAlchemy 2.x entities.
- `app/schemas`: Pydantic v2 request and response contracts.
- `app/api`: FastAPI routers. Responses use `{success, data, message}` and errors use `{success, error}`.
- `app/services`: replaceable AI, routing, QR, workflow, notification, compliance, and credit services.
- `alembic`: migration configuration and initial schema migration.

The application uses PostgreSQL through `postgresql+asyncpg`. For local smoke tests, the default is SQLite with `aiosqlite`; set `DATABASE_URL` for PostgreSQL or Supabase's standard PostgreSQL connection string.

## Gemini image classification

The default AI provider is the deterministic `mock` provider. To enable Gemini image classification:

1. Obtain a Gemini API key.
2. Put it in `.env`:

```env
GEMINI_API_KEY=your_key_here
AI_PROVIDER=gemini
GEMINI_MODEL=gemini-2.5-flash
```

3. Start the backend:

```powershell
uvicorn app.main:app --reload
```

Call `POST /api/waste/classify` as a facility administrator with a multipart `image` field containing a JPEG, PNG, or WebP image. The response contains a persisted `classification_id`, application category, AI assessment confidence, recommended bin, reason, and human-verification flag. Low-confidence results must be confirmed through `POST /api/waste/classifications/{classification_id}/confirm` before creating waste. Gemini can later be replaced by a CNN or transfer-learning provider behind the same service interface.

## Setup on Windows

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Set a long random `JWT_SECRET_KEY` and your PostgreSQL `DATABASE_URL` in `.env`. With Supabase, use the database connection string from the project database settings and keep credentials only in environment variables.

## Run

```powershell
alembic upgrade head
python -m app.seed.seed_data
uvicorn app.main:app --reload
```

Health: `GET /health`  
Swagger: `/docs`  
ReDoc: `/redoc`

The development seed accounts are `facility@smartmedwaste.demo`, `collector@smartmedwaste.demo`, and `admin@smartmedwaste.demo`. Their development password is `demo123`. You can override it with `DEMO_PASSWORD`, or set role-specific `DEMO_FACILITY_PASSWORD`, `DEMO_COLLECTOR_PASSWORD`, and `DEMO_ADMIN_PASSWORD` values. Change these values before sharing an environment.

## Frontend integration

Send `Authorization: Bearer <access_token>` on protected requests. Facility users are scoped to their facility, collectors are scoped to assigned requests, and administrator access is enforced server-side. The mock classifier and mock routing adapter are intentionally isolated so real model or map providers can replace them without changing routers.

## Tests

```powershell
pytest
```
