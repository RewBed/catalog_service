# Base Service — Development & Setup

## 1. Requirements

- Node.js v24+
- npm v10+
- Docker & Docker Compose
- Git
- IDE (VSCode, WebStorm, etc.)

---

## 2. Clone the repository

```bash
git clone <REPO_URL>
cd <REPO_FOLDER>
```

---

## 3. Install dependencies

```bash
npm ci
```

---

## 4. Configure environment

Copy `.env.example` to `.env` and update if necessary:

```env
# PostgreSQL
POSTGRES_USER=admin_user
POSTGRES_PASSWORD=super_secret_password
POSTGRES_DB=base_service
POSTGRES_PORT=5432

# Application
SERVICE_PORT=3000
DATABASE_URL=postgresql://admin_user:super_secret_password@localhost:5432/base_service?schema=public
```

---

## 5. Start PostgreSQL (dev)

```bash
docker compose -f docker-compose.dev.yml up -d
```

- Database will be accessible on `localhost:5432`.
- Check status:

```bash
docker compose -f docker-compose.dev.yml ps
```

- Stop database:

```bash
docker compose -f docker-compose.dev.yml down
```

---

## 6. Generate Prisma Client

```bash
npx prisma generate
```

---

## 7. Apply migrations

```bash
# Apply all existing migrations
npx prisma migrate deploy

# Create and apply new migration
npx prisma migrate dev --name <migration_name>
```

---

## 8. Run application locally (dev)

```bash
npm run start:dev
```

- NestJS app will start with hot reload.
- HTTP REST: `http://localhost:3000`
- gRPC: `localhost:50051` (plaintext, TLS off)

**Example REST health endpoints:**

```bash
GET http://localhost:3000/health/live
GET http://localhost:3000/health/ready
```

**Example gRPC:**

- Proto file: `grpc/proto/health.proto`
- Package: `health`
- Service: `HealthService`
- Method: `Check`
- URL: `localhost:50051`  
- TLS: **OFF**

---

## 9. Build & run with Docker (production)

```bash
docker compose build --no-cache
docker compose up -d
```

> Service will start, apply migrations, and run NestJS + gRPC automatically.

---

## 10. Useful commands

| Command | Purpose |
|---------|---------|
| `npm run start:dev` | Start NestJS locally with hot-reload |
| `npx prisma generate` | Generate Prisma client |
| `npx prisma migrate deploy` | Apply migrations to database |
| `docker compose -f docker-compose.dev.yml up -d` | Start PostgreSQL for development |
| `docker compose -f docker-compose.dev.yml down` | Stop PostgreSQL |
| `docker compose build --no-cache` | Build Docker images for production |

---

## Notes

- Always make sure `DATABASE_URL` in `.env` points to the correct database.
- gRPC port must be available locally (`50051`) for development testing.
- For production, configure proper ports and TLS if needed.

