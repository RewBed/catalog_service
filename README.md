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

| Command                                                                | Purpose                                               |
| ---------------------------------------------------------------------- | ----------------------------------------------------- |
| `npm run start:dev`                                                    | Start NestJS locally with hot-reload                  |
| `npm test`                                                             | Run all Jest tests                                    |
| `npm test -- --runInBand`                                              | Run Jest tests sequentially (stable local run)        |
| `npm test -- --runInBand --coverage`                                   | Run tests with coverage report                         |
| `npm run test:integration:db`                                          | Run full DB integration suite (real Postgres + Prisma) |
| `npm run test:integration:db:cov`                                      | Run DB integration suite with coverage                |
| `npm run test:e2e`                                                     | Run HTTP E2E suite (NestApplication + supertest)      |
| `npm run test:e2e:cov`                                                 | Run HTTP E2E suite with coverage                       |
| `npx prisma generate`                                                  | Generate Prisma client                                |
| `npx prisma migrate deploy`                                            | Apply migrations to database                          |
| `docker compose -f docker-compose.dev.yml up -d`                       | Start PostgreSQL for development                      |
| `docker compose -f docker-compose.dev.yml down`                        | Stop PostgreSQL                                       |
| `docker compose build --no-cache`                                      | Build Docker images for production                    |
| `prisma-seed`                                                          | Dev database seed                                     |
| `npm run http:smoke -- --base-url http://localhost:3002 --token <JWT>` | Run OpenAPI HTTP smoke against all documented methods |

---

## 11. Run unit tests (Jest)

Basic run:

```bash
npm test
```

Recommended deterministic local run:

```bash
npm test -- --runInBand
```

Run with coverage:

```bash
npm test -- --runInBand --coverage
```

How to read the summary output:

```text
Test Suites: 14 passed, 14 total
Tests:       72 passed, 72 total
Snapshots:   0 total
Time:        1.407 s, estimated 2 s
Ran all test suites.
```

- `Test Suites` - number of test files (`*.spec.ts`) that were executed.
- `Tests` - total number of individual test cases (`it(...)`) that ran.
- `Snapshots` - number of snapshot checks (0 means snapshots are not used).
- `Time` - actual run time and Jest estimated run time.
- `Ran all test suites` - Jest discovered and executed the full test set.

---

## 12. Run integration DB tests (real Postgres + Prisma)

These tests validate real database behavior (not mocks):

- soft delete / restore flows
- unique indexes (`slug`, `sku`, `productId+branchId`, `collectionId+productId`)
- filters and pagination
- `collection-items` and `branch-products` relations
- image events persistence (`ProductImage`, `CategoryImage`, `InboxEvent`)
- outbox persistence flow (`OutboxEvent`)

Current entity coverage in integration DB suite:

- `Category`
- `Product`
- `ProductVariantGroup` + `ProductVariantOption`
- `Branch`
- `BranchProduct`
- `ProductCollection` + `ProductCollectionItem`
- `ProductImage` + `CategoryImage`
- `InboxEvent`
- `OutboxEvent`

### Prerequisites

- Running PostgreSQL instance
- Applied migrations (handled automatically by integration test setup)

If you run local Postgres via docker-compose:

```bash
docker compose -f docker-compose.dev.yml up -d
```

### Environment variables

Integration setup loads `.env` and then applies optional test overrides:

- `TEST_POSTGRES_HOST`
- `TEST_POSTGRES_PORT`
- `TEST_POSTGRES_USER`
- `TEST_POSTGRES_PASSWORD`
- `TEST_POSTGRES_DB`

If `TEST_POSTGRES_DB` is not set, test setup uses `${POSTGRES_DB}_test` automatically (or keeps current DB name if it already contains `test`).

### Commands

```bash
npm run test:integration:db
npm run test:integration:db:cov
```

What setup does automatically before tests:

1. Creates test database if it does not exist.
2. Applies all Prisma migrations to that test database.
3. Runs DB integration specs sequentially (`--runInBand`).

---

## 13. Run HTTP E2E tests (Nest + supertest)

E2E suite starts real `NestApplication` with `AppModule` and hits HTTP routes via `supertest`.

What is covered:

- Public and admin route flows for catalog entities
- create / update / delete / restore cycles
- DTO validation errors (`400`)
- auth errors for admin routes (`401`)
- not found and state-dependent errors (`404`)

Command:

```bash
npm run test:e2e
```

With coverage:

```bash
npm run test:e2e:cov
```

How to see exactly which methods passed/failed:

1. Jest `--verbose` output prints each E2E test case.
2. Detailed per-method report is generated at:
   `reports/e2e-http-latest.json`
3. Console prints compact summary lines per request in format:
   `PASS/FAIL METHOD PATH expected=... actual=...`

PowerShell helpers (from project root):

```powershell
# Only failed methods with error text
$r = Get-Content reports/e2e-http-latest.json -Raw | ConvertFrom-Json
$r.methods | Where-Object { -not $_.ok } | Select-Object method,path,expectedStatus,actualStatus,error

# Full method table (PASS/FAIL + duration)
$r.methods | Select-Object @{Name='status';Expression={if($_.ok){'PASS'}else{'FAIL'}}},method,path,actualStatus,durationMs
```

Auth in E2E:

- Real `GrpcAuthGuard` stays enabled.
- gRPC auth dependency is overridden with fake `AUTH_SERVICE_GRPC` client in tests.
- Admin routes use header:
  `Authorization: Bearer <token>`
- Token value comes from env `E2E_AUTH_TOKEN` (default: `e2e-token`).

Pass token at run time:

```powershell
$env:E2E_AUTH_TOKEN = 'my-token'
npm run test:e2e
```

```bash
E2E_AUTH_TOKEN=my-token npm run test:e2e
```

---

## HTTP smoke run

Command:

```bash
npm run http:smoke -- --base-url http://localhost:3002 --token <JWT>
```

Runner features:

- Executes all HTTP methods from `openapi.json`
- Prioritizes `POST` creation endpoints and then uses created ids/slugs in dependent methods
- Shows real-time status list in terminal (`PEND/RUN/PASS/FAIL/SKIP`)
- Marks dependent endpoints as `SKIP` when required entities were not created
- Writes JSON report with full request/response details to `reports/http-smoke-latest.json`
- Generates visual HTML report at `reports/http-smoke-latest.html` with status highlighting

Optional flags:

```bash
--spec openapi.json
--timeout-ms 20000
--report reports/my-run.json
--html-report reports/my-run.html
--fail-fast
```

---

## Notes

- Always make sure `DATABASE_URL` in `.env` points to the correct database.
- gRPC port must be available locally (`50051`) for development testing.
- For production, configure proper ports and TLS if needed.

---

## Kafka image events (entity topic bindings)

Catalog uses a single KafkaJS consumer for image lifecycle events and subscribes to entity topics from env configuration.

Supported event types in message payload:

- `image.uploaded` and `<topic>.image.uploaded`
- `image.deleted` and `<topic>.image.deleted`
- `image.updated` and `<topic>.image.updated`

Configuration options:

- `KAFKA_IMAGE_EVENT_ENTITY_TOPICS` - comma-separated `entityType=topic` bindings.
  Example: `catalog.product=catalog_product,catalog.category=catalog_category`
- `KAFKA_GROUP_ID_IMAGE_EVENTS` - consumer group for universal image events consumer.

Behavior:

- Consumer subscribes only to configured topics and does not auto-create Kafka topics.
- Uploaded events create local image rows for the target entity and store `type`, `title`, `description`.
- Updated events change local image metadata for the target entity with stale-event protection by `updatedAt`.
- Deleted events remove local image rows for the target entity.
