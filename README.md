# User Tracking System

NestJS tracking collector for ingesting Ghabzino-compatible events, validating them, enriching identity and attribution fields, and storing them in PostgreSQL.

## Prerequisites

- Node.js 24 from `C:\Users\Ayan\node-v24.14.1-win-x64`
- Docker Desktop
- Git

## Local Setup

```powershell
$env:Path = "C:\Users\Ayan\node-v24.14.1-win-x64;C:\Program Files\Git\cmd;$env:Path"
Copy-Item .env.example .env
npm install
docker compose up -d postgres
npm run migration:run
npm run seed
npm run start:dev
```

Swagger will be available at:

```text
http://localhost:3000/docs
```

Health endpoints:

```text
GET http://localhost:3000/api/v1/health
GET http://localhost:3000/api/v1/ready
```

Event ingest endpoint:

```text
POST http://localhost:3000/api/v1/events
```
