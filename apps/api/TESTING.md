# API Testing

## Swagger docs endpoint

| Environment | URL |
|-------------|-----|
| Local (default port) | **`http://localhost:3011/api/docs`** |
| With custom `PORT` | `http://localhost:<PORT>/api/docs` |
| Path only (behind proxy) | **`/api/docs`** |

Swagger is enabled when the API is **not** in production, or when `ENABLE_SWAGGER=true`. All endpoints are documented with tags, request/response schemas, and bearer auth (JWT).

## Unit tests (no DB/Redis)

Run controller and service unit tests (mocked dependencies):

```bash
pnpm test
```

## E2E tests (requires DB + Redis)

E2E tests bootstrap the full app and hit HTTP endpoints. They require:

- **Postgres**: `DATABASE_URL` (e.g. `postgresql://user:pass@localhost:5432/fis_test`)
- **Redis**: `REDIS_URL` (e.g. `redis://localhost:6379`)

Run e2e tests:

```bash
# With .env or .env.local pointing at test DB and Redis
pnpm run test:e2e
```

To run e2e in CI or Docker, ensure Postgres and Redis are up and env vars are set before `pnpm run test:e2e`.

## Test coverage

- **Unit tests** (81 tests): Auth (controller + service critical), Health controller, Code execution/exercise services, Payment critical. Run with `pnpm test`.
- **E2E tests**: Health, Auth (register/login/forgot-password validation and 401 on protected routes), Categories, Courses, Consent, Site settings, Subscriptions, and a set of protected GET endpoints (401 without token). Require `DATABASE_URL` and `REDIS_URL` (e.g. `postgresql://…@localhost:5432/fis_test`, `redis://localhost:6379`). Run with `pnpm run test:e2e`.
