# User Tracking System

NestJS-based tracking collector for Ghabzino-compatible events and user login reporting.

The system currently supports two separate API responsibilities:

- Event collection: receive tracking events, validate them, enrich identity/attribution, and store accepted or invalid payloads.
- User login reporting: upsert known users during login, preserve first attribution, update last attribution, and increment login count.

## Current Readiness

This project is currently ready for local development and functional testing.

It is not ready for operational production load yet.

Current status:

```text
Ready for local development: yes
Ready for local API testing: yes
Ready for internal testing behind a trusted network: after API auth is enforced
Ready for operational load: no
Ready for real public/mobile/web client traffic: no
```

You can still run and test everything locally with Docker, Swagger, and PostgreSQL using the setup below.

## Minimum Work Before Operational Load

Before connecting real clients or running this service under sustained ingestion load, complete these items:

1. Add real API key authentication.
2. Add a separate backend API key or trusted path for payment callback events.
3. Prevent clients from spoofing backend-only fields such as `producer = backend` or `platform = backend`.
4. Add rate limiting and abuse protection.
5. Cache `tracking_event_registry` in memory instead of querying it on every event.
6. Configure PostgreSQL connection pool settings explicitly.
7. Reduce hot-path database writes or make session/identity upserts optional for phase 1.
8. Remove or defer heavy JSONB GIN indexes on hot write tables until they are proven necessary.
9. Add raw payload sensitive-key detection or redaction rules.
10. Add basic operational metrics for ingest rate, invalid payload rate, DB latency, and registry misses.
11. Run load tests at 100, 300, and 500 requests per second before rollout.

PostgreSQL can be enough for phase 1, but the ingestion path must be hardened and measured before operational use.

## Stack

- Backend: NestJS
- Database: PostgreSQL 16
- API docs: Swagger/OpenAPI
- Runtime: Node.js 24
- Local services: Docker Compose

## Prerequisites

- Node.js portable runtime at `C:\Users\Ayan\node-v24.14.1-win-x64`
- Docker Desktop
- Git for Windows

For this machine, use this PowerShell path setup before running npm commands:

```powershell
$env:Path = "C:\Users\Ayan\node-v24.14.1-win-x64;C:\Program Files\Git\cmd;$env:Path"
```

## Local Setup

```powershell
Copy-Item .env.example .env
npm install
docker compose up -d postgres
npm run migration:run
npm run seed
npm run start:dev
```

Swagger:

```text
http://localhost:3000/docs
```

## Environment

Default local configuration:

```text
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_USER=tracking
DATABASE_PASSWORD=tracking
DATABASE_NAME=tracking
DATABASE_POOL_MAX=20
DATABASE_IDLE_TIMEOUT_MS=30000
DATABASE_CONNECTION_TIMEOUT_MS=2000

API_KEY=dev-tracking-api-key
BACKEND_API_KEY=dev-backend-api-key

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_CLIENT_MAX=10000
RATE_LIMIT_BACKEND_MAX=30000

TRACKING_SESSION_UPSERT_ENABLED=false
TRACKING_IDENTITY_LINK_UPSERT_ENABLED=false
TRACKING_REGISTRY_REFRESH_MS=60000
TRACKING_RAW_PAYLOAD_MAX_BYTES=131072
```

PostgreSQL is exposed on host port `5433` because this machine already has another PostgreSQL service on `5432`.

DB connection for DBeaver, DataGrip, or pgAdmin:

```text
Host: localhost
Port: 5433
Database: tracking
Username: tracking
Password: tracking
```

Docker psql login:

```powershell
docker exec -it tracking_postgres psql -U tracking -d tracking
```

## Scripts

```powershell
npm run build
npm run lint
npm run migration:run
npm run seed
npm run start:dev
npm run load:test -- 100 30
```

## Database

Core tables:

- `tracking_events`
- `tracking_invalid_events`
- `tracking_event_registry`
- `tracking_sessions`
- `identity_links`
- `users`
- `schema_migrations`

Migrations:

- `001_create_tracking_schema.sql`: event collection schema.
- `002_create_users_table.sql`: user login reporting schema.

The `users` table is intentionally not a full profile table. It stores the user-level login snapshot required for reporting:

- `user_id`: hashed phone, primary key.
- `first_seen_at`
- `last_login_at`
- `login_count`
- first attribution fields
- last attribution fields
- last platform/product/store fields

## Health API

```text
GET /api/v1/health
GET /api/v1/ready
```

`/ready` checks the database connection.

These endpoints are public for local and orchestration checks.

## Authentication

All non-health endpoints require an API key:

```http
x-api-key: dev-tracking-api-key
```

Backend-only payment callback events require the backend API key:

```http
x-api-key: dev-backend-api-key
```

Trust boundary rules:

- Client API keys cannot submit `platform = backend`.
- Client API keys cannot submit `metadata.producer = backend`.
- Client API keys cannot submit `metadata.source_of_truth = backend`.
- `payment_callback_*` events require the backend API key.
- `payment_callback_*` events require `metadata.idempotency_key`.

## Rate Limiting

The app includes a lightweight in-memory API-key-based rate limiter.

Default local limits:

```text
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_CLIENT_MAX=10000
RATE_LIMIT_BACKEND_MAX=30000
```

This is enough for local and single-instance phase-1 testing. For multiple app instances, replace it with Redis-backed rate limiting.

## Operational Metrics

```text
GET /api/v1/metrics
```

Requires `x-api-key`.

The metrics endpoint returns Prometheus-style text for:

- event ingest totals by status/event
- event ingest latency
- registry cache refreshes
- registry lookup hit/miss
- user login totals
- user login latency

Example:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/v1/metrics" `
  -Headers @{ "x-api-key" = "dev-tracking-api-key" }
```

## Event Ingestion API

```text
POST /api/v1/events
```

Example:

```json
{
  "event_name": "start_WBI_fail",
  "event_time": "2026-04-15T10:00:00Z",
  "product_name": "ghabzino",
  "platform": "web",
  "user": {
    "user_id": "hashed_phone_value",
    "anonymous_id": "anon_123",
    "session_id": "sess_456"
  },
  "attribution": {
    "campaign_name": "organic",
    "source": "google",
    "medium": null,
    "referer": "google.com",
    "attribution_source_type": "referrer"
  },
  "parameters": {
    "Product": "waterbillinquiry",
    "message": "service unavailable",
    "error_code": "GXXXX"
  },
  "metadata": {
    "producer": "client",
    "source_of_truth": "client",
    "schema_version": "1.0"
  }
}
```

Success response:

```json
{
  "success": true,
  "event_id": "evt_...",
  "validation_status": "valid",
  "received_at": "2026-04-15T10:00:00.000Z"
}
```

Important validation behavior:

- `event_name` must exist in `tracking_event_registry`.
- Unknown parameters are allowed.
- Client events require `session_id`.
- Every event requires at least `user.user_id` or `user.anonymous_id`.
- Accepted events are stored in `tracking_events`.
- Rejected events are stored in `tracking_invalid_events`.
- `payment_callback_*` events must come from backend.

## User Login Reporting API

```text
POST /api/v1/users/login
```

This API is separate from event ingestion. It is not a behavior event. It updates the user-level login snapshot in `users`.

Example:

```json
{
  "user_id": "hashed_phone_value",
  "product_name": "ghabzino",
  "platform": "android",
  "login_time": "2026-04-20T10:25:00Z",
  "attribution": {
    "campaign_name": "Esfand1404_newservice_promotion",
    "source": "yektanet",
    "medium": "banner",
    "referer": null,
    "landing_page": null,
    "store": "cafebazaar"
  },
  "metadata": {
    "schema_version": "1.0",
    "trace_id": "trace_login_001"
  }
}
```

Created response:

```json
{
  "success": true,
  "user_id": "hashed_phone_value",
  "action": "created",
  "last_login_at": "2026-04-20T10:25:00.000Z",
  "login_count": 1
}
```

Updated response:

```json
{
  "success": true,
  "user_id": "hashed_phone_value",
  "action": "updated",
  "last_login_at": "2026-04-20T10:25:00.000Z",
  "login_count": 2
}
```

Validation rules:

- `user_id` is required and must be a non-empty string.
- `product_name` is required.
- `platform` must be one of `web`, `android`, `ios`, `backend`.
- `login_time` is required and must be a valid datetime.
- `attribution`, when present, must be an object.

Upsert behavior:

- New user:
  - `first_seen_at = login_time`
  - `last_login_at = login_time`
  - `login_count = 1`
  - first attribution and last attribution are both set from this login.
- Existing user:
  - `last_login_at = login_time`
  - `login_count = login_count + 1`
  - first attribution remains unchanged.
  - last attribution is updated from this login.

## Testing With PowerShell

Health:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/health" -Method Get
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/ready" -Method Get
```

User login:

```powershell
$body = @{
  user_id = "hashed_phone_value"
  product_name = "ghabzino"
  platform = "android"
  login_time = "2026-04-20T10:25:00Z"
  attribution = @{
    campaign_name = "Esfand1404_newservice_promotion"
    source = "yektanet"
    medium = "banner"
    referer = $null
    landing_page = $null
    store = "cafebazaar"
  }
  metadata = @{
    schema_version = "1.0"
    trace_id = "trace_login_001"
  }
} | ConvertTo-Json -Depth 8

Invoke-RestMethod `
  -Uri "http://localhost:3000/api/v1/users/login" `
  -Method Post `
  -Body $body `
  -ContentType "application/json" `
  -Headers @{ "x-api-key" = "dev-tracking-api-key" }
```

## Local Load Testing

The repository includes a basic no-dependency load-test script:

```powershell
npm run load:test -- 100 30
npm run load:test -- 300 30
npm run load:test -- 500 30
```

Arguments:

```text
npm run load:test -- <requests_per_second> <duration_seconds>
```

The script sends valid `POST /api/v1/events` requests with `x-api-key`.

Before testing, make sure:

```powershell
docker compose up -d postgres
npm run migration:run
npm run seed
npm run start:dev
```

Interpretation:

- `100` req/sec: basic steady-state check.
- `300` req/sec: expected peak lower bound.
- `500` req/sec: expected burst upper bound.

Do not treat local laptop load-test results as production capacity. Use them to catch obvious bottlenecks and regressions before testing on staging-like infrastructure.

## Useful SQL

Recent events:

```sql
SELECT
  event_id,
  event_name,
  platform,
  user_id,
  anonymous_id,
  session_id,
  validation_status,
  received_at
FROM tracking_events
ORDER BY received_at DESC;
```

Invalid events:

```sql
SELECT
  event_name,
  error_code,
  error_message,
  validation_errors,
  received_at,
  raw_payload
FROM tracking_invalid_events
ORDER BY received_at DESC;
```

Known users:

```sql
SELECT
  user_id,
  first_seen_at,
  last_login_at,
  login_count,
  first_campaign_name,
  first_source,
  first_medium,
  last_campaign_name,
  last_source,
  last_medium,
  last_platform,
  last_product_name,
  last_store
FROM users
ORDER BY last_login_at DESC;
```

Join known users to events:

```sql
SELECT
  u.user_id,
  u.login_count,
  u.first_seen_at,
  u.last_login_at,
  e.event_name,
  e.platform,
  e.received_at
FROM users u
LEFT JOIN tracking_events e ON e.user_id = u.user_id
ORDER BY u.last_login_at DESC, e.received_at DESC;
```

## GitHub

This folder is already initialized as a Git repository on branch `main`.

To connect it to a new GitHub repository:

```powershell
& "C:\Program Files\Git\cmd\git.exe" remote add origin https://github.com/YOUR_USERNAME/user-tracking-system.git
& "C:\Program Files\Git\cmd\git.exe" push -u origin main
```
