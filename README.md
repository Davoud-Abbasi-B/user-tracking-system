# User Tracking System

**A growth analytics and attribution backend for collecting, validating, enriching, and storing product events and user-level acquisition data.**

This project explores a problem I regularly face in growth marketing: **how to connect acquisition sources and campaigns to what users actually do after they arrive**.

Instead of stopping at ad-platform or client-side reporting, the system provides a backend foundation for collecting behavioral events, preserving attribution context, tracking known-user logins, and preparing data for funnel, lifecycle, and campaign analysis.

## Why I built it

Growth teams often need to answer questions such as:

- Which campaign or source first brought a user?
- What was the user's most recent attribution?
- Which users moved from anonymous activity to known-user activity?
- What events happened after acquisition?
- Where are users dropping in a product funnel?
- Which event payloads are invalid or inconsistent?
- Can marketing and product reporting rely on the same event definitions?

This project was built to explore those questions at the **data-collection layer**, not only inside dashboards.

It is also part of my **AI-assisted development workflow using OpenAI Codex + VS Code**, where I define the measurement requirements and system behavior, use AI to accelerate implementation, then review, test, debug, and iterate on the result.

## What the system does

### Event collection

The API can:

- receive product and marketing events
- validate event names against an event registry
- validate identity and session requirements
- preserve attribution data with the event
- distinguish client-produced and backend-produced events
- store accepted events
- store rejected events separately for debugging and data-quality analysis

### User-level attribution

The login-reporting flow maintains a lightweight user snapshot including:

- first seen time
- last login time
- login count
- first-touch campaign/source/medium
- latest campaign/source/medium
- latest platform
- latest product
- latest store/source context

This makes it possible to preserve both **first-touch** and **latest-touch** acquisition context without overwriting the original attribution.

### Identity & session foundation

The schema includes dedicated structures for:

- user events
- sessions
- identity links
- known users
- event definitions

The architecture is designed to support a clearer connection between behavioral activity and known-user reporting.

## Growth use cases

From a growth perspective, this type of system can support analysis such as:

```text
Campaign / Source
       ↓
Landing / Visit
       ↓
Anonymous Activity
       ↓
Registration / Login
       ↓
Known User
       ↓
Product Events
       ↓
Conversion / Retention Analysis
```

Potential downstream questions include:

- acquisition quality by channel
- funnel conversion by campaign
- first-touch vs latest-touch performance
- activation after signup
- repeat usage by acquisition cohort
- event failure/debugging rates
- user-level lifecycle analysis

## Architecture

```text
Web / Mobile / Backend
          ↓
      Tracking API
          ↓
  Validation & Trust Rules
          ↓
 Identity / Attribution Enrichment
          ↓
      PostgreSQL
          ↓
 Analytics / BI / Growth Reporting
```

## Tech stack

- **NestJS**
- **TypeScript**
- **PostgreSQL 16**
- **Swagger / OpenAPI**
- **Node.js**
- **Docker Compose**
- **Prometheus-style operational metrics**

## Core data model

The project currently uses these main tables:

- `tracking_events`
- `tracking_invalid_events`
- `tracking_event_registry`
- `tracking_sessions`
- `identity_links`
- `users`
- `schema_migrations`

### Event registry

Valid event names are controlled through `tracking_event_registry`.

This creates a central event-definition layer so unknown event names can be rejected rather than silently polluting analytics data.

### Invalid-event storage

Rejected events are saved separately in `tracking_invalid_events`.

That makes data-quality problems observable instead of simply dropping malformed requests.

## API overview

### Health

```text
GET /api/v1/health
GET /api/v1/ready
```

### Event ingestion

```text
POST /api/v1/events
```

Example:

```json
{
  "event_name": "checkout_started",
  "event_time": "2026-04-15T10:00:00Z",
  "product_name": "sample_product",
  "platform": "web",
  "user": {
    "user_id": "hashed_user_id",
    "anonymous_id": "anon_123",
    "session_id": "sess_456"
  },
  "attribution": {
    "campaign_name": "spring_campaign",
    "source": "google",
    "medium": "cpc",
    "referer": "google.com",
    "attribution_source_type": "referrer"
  },
  "parameters": {
    "plan": "standard"
  },
  "metadata": {
    "producer": "client",
    "source_of_truth": "client",
    "schema_version": "1.0"
  }
}
```

Successful events return an event ID, validation status, and receive timestamp.

### User login reporting

```text
POST /api/v1/users/login
```

This endpoint is intentionally separate from behavioral event ingestion. It maintains a user-level login and attribution snapshot.

Example:

```json
{
  "user_id": "hashed_user_id",
  "product_name": "sample_product",
  "platform": "android",
  "login_time": "2026-04-20T10:25:00Z",
  "attribution": {
    "campaign_name": "remarketing_campaign",
    "source": "paid_media",
    "medium": "display",
    "store": "android_store"
  },
  "metadata": {
    "schema_version": "1.0",
    "trace_id": "trace_login_001"
  }
}
```

For an existing user, the service preserves the original attribution while updating the latest attribution and login count.

## Trust boundaries

Non-health endpoints use API-key authentication.

The project also distinguishes normal client events from backend-only events.

Current trust rules include:

- client credentials cannot impersonate backend producers
- backend-only event families require separate credentials
- backend callback events require an idempotency key
- event identity and session requirements are validated before acceptance

These controls are useful when analytics includes both client-side behavior and server-side conversion events.

## Operational visibility

The service exposes a metrics endpoint:

```text
GET /api/v1/metrics
```

Metrics currently cover:

- event ingest totals
- valid vs invalid event counts
- ingest latency
- registry cache activity
- registry hit/miss behavior
- user-login totals
- login-processing latency

The goal is to make the tracking system itself measurable rather than assuming that data collection is always healthy.

## Local setup

Prerequisites:

- Node.js
- Docker
- npm

Create the environment file:

```bash
cp .env.example .env
```

Install dependencies and start PostgreSQL:

```bash
npm install
docker compose up -d postgres
npm run migration:run
npm run seed
npm run start:dev
```

Swagger is available locally at:

```text
http://localhost:3000/docs
```

## Useful commands

```bash
npm run build
npm run lint
npm run migration:run
npm run seed
npm run start:dev
```

A basic local load-test script is also included:

```bash
npm run load:test -- 100 30
npm run load:test -- 300 30
npm run load:test -- 500 30
```

The arguments are:

```text
npm run load:test -- <requests_per_second> <duration_seconds>
```

Local load-test results should be treated as development diagnostics, not production-capacity benchmarks.

## Project status

This repository is a **working development and functional-testing implementation**, not a claim of production-scale infrastructure.

Before exposing a tracking collector like this to sustained real-world traffic, I would validate and harden areas such as:

- distributed rate limiting
- secret management
- sensitive-payload redaction
- database connection/pooling strategy
- hot-path write volume
- observability and alerting
- staging-scale load testing
- multi-instance behavior
- retention and data-governance policies

Keeping this distinction explicit is important: tracking infrastructure affects marketing decisions, so reliability and data quality matter as much as event volume.

## AI-assisted development

I built and iterated this project using **OpenAI Codex + VS Code**.

My workflow included:

1. Defining the measurement and attribution requirements
2. Translating growth questions into data and API requirements
3. Designing event, identity, attribution, and user-reporting flows
4. Using AI-assisted coding to accelerate implementation
5. Reviewing and debugging generated changes
6. Testing APIs locally with PostgreSQL and Swagger
7. Identifying operational risks and hardening requirements
8. Iterating on data quality, security boundaries, and observability

This project is a practical example of how I combine **growth marketing, analytics thinking, and hands-on AI-assisted building**.

## Portfolio context

My core background is growth and performance marketing, not backend engineering.

I built this system because I wanted deeper control over a part of growth that is often treated as a black box: **tracking, attribution, identity, and conversion data collection**.

It demonstrates how I approach growth problems end to end:

```text
Business question
      ↓
Measurement design
      ↓
Tracking architecture
      ↓
Data collection
      ↓
Validation
      ↓
Analysis-ready data
      ↓
Growth decision
```

---

Built by **Davoud Abbasi**  
Growth marketer & AI-assisted product builder
