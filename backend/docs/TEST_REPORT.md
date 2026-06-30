# Test Report

## How to run

```bash
# unit tests run with no infrastructure
npm test

# with coverage
npm run test:coverage
```

Integration tests require Postgres and Redis running (use `docker compose up -d
postgres redis`) and a migrated database (`npm run prisma:migrate`).

## Test suites

| Suite | Type | What it covers |
|-------|------|----------------|
| `auth.schema.test.ts` | Unit | Zod validation: email, password length, required fields |
| `auth.integration.test.ts` | Integration | Register, duplicate guard, login, wrong password, `/me`, auth guard |
| `task.integration.test.ts` | Integration | Project create, task create, status update, list, search, membership guard |

## Sample run

Paste the output of `npm run test:coverage` here after running locally, e.g.:

```
Test Suites: 3 passed, 3 total
Tests:       15 passed, 15 total
```
