# PRD: Bamboo Instructor Dashboard - Quality & Infrastructure Improvements

## Overview
Add comprehensive testing, CI/CD pipeline, error tracking, and API validation to the existing Next.js 16 instructor dashboard for Bamboo Bicycle Club.

## Current State
- **Framework**: Next.js 16.1.3 with React 19, TypeScript
- **Database**: PostgreSQL with Prisma 6.2.1
- **Auth**: NextAuth.js 5.0 (credentials + OAuth)
- **API Routes**: 23 endpoints
- **Test Coverage**: <2% (only 1 test file exists)
- **CI/CD**: None
- **Error Tracking**: None
- **Files**: 189 TypeScript files

## Goals
1. Achieve >80% test coverage on API routes
2. Automated CI/CD on every PR
3. Production error tracking with Sentry
4. Input validation on all API endpoints
5. API documentation

---

## Phase 1: Testing Infrastructure (Priority: CRITICAL)

### 1.1 Unit Tests for API Routes
Create Jest tests for all 23 API routes using supertest.

**Endpoints to test:**
```
/api/admin/stats
/api/admin/lessons/[lessonId]/section-order
/api/auth/register
/api/cohorts (CRUD)
/api/cohorts/[id]/learners (CRUD)
/api/cohorts/[id]/sessions (CRUD)
/api/cohorts/[id]/assessments
/api/cohorts/[id]/iqa
/api/courses
/api/lessons/[lessonId]
/api/notion/sync
/api/notion/health
/api/progress
/api/upload
```

**Test patterns:**
- Happy path (valid input → expected output)
- Error cases (invalid input → proper error response)
- Auth checks (unauthorized → 401)
- Role checks (wrong role → 403)

### 1.2 Database Mocking
- Use Prisma mock or in-memory SQLite for tests
- Seed test data for each test suite
- Clean up after each test

### 1.3 Integration Tests
Test complete flows:
1. **Auth flow**: Register → Login → Access protected route
2. **Cohort flow**: Create cohort → Add learner → Record attendance
3. **Assessment flow**: Start session → Complete checklist → Sign off assessment
4. **Notion sync**: Trigger sync → Verify content updated

### 1.4 E2E Tests (Playwright)
Critical user journeys:
1. Instructor login
2. Navigate to course → lesson → teaching mode
3. Session delivery with checklist completion
4. Assessment signoff workflow

**File structure:**
```
__tests__/
├── api/
│   ├── auth.test.ts
│   ├── cohorts.test.ts
│   ├── learners.test.ts
│   ├── sessions.test.ts
│   ├── assessments.test.ts
│   └── notion.test.ts
├── integration/
│   ├── auth-flow.test.ts
│   ├── cohort-flow.test.ts
│   └── assessment-flow.test.ts
└── e2e/
    ├── login.spec.ts
    ├── teaching-mode.spec.ts
    └── assessment.spec.ts
```

---

## Phase 2: CI/CD Pipeline (Priority: CRITICAL)

### 2.1 GitHub Actions Workflow

**On Pull Request:**
1. Install dependencies
2. Run ESLint
3. Run TypeScript type check
4. Run unit tests
5. Run integration tests
6. Build verification
7. Report coverage

**On Merge to Main:**
1. All PR checks
2. E2E tests
3. Deploy to Vercel (production)

**Workflow file:** `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    needs: lint-and-type-check
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma db push
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      - run: npm test -- --coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      - uses: codecov/codecov-action@v3

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
        env:
          SKIP_ENV_VALIDATION: true

  e2e:
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

### 2.2 Package.json Scripts
Add missing scripts:
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## Phase 3: Error Tracking (Priority: HIGH)

### 3.1 Sentry Integration

**Install:**
```bash
npm install @sentry/nextjs
```

**Configuration:**
- `sentry.client.config.ts` - Browser error tracking
- `sentry.server.config.ts` - Server error tracking
- `sentry.edge.config.ts` - Edge runtime tracking

**Features:**
- Automatic error capture
- Performance monitoring
- Session replay (optional)
- Release tracking

**Environment variables:**
```
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ORG=bamboo-bicycle-club
SENTRY_PROJECT=instructor-dashboard
```

### 3.2 Structured Error Handling
Create error utility:
```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, unknown>
  ) {
    super(message);
  }
}

export const ErrorCodes = {
  UNAUTHORIZED: 'AUTH_001',
  FORBIDDEN: 'AUTH_002',
  NOT_FOUND: 'RESOURCE_001',
  VALIDATION_ERROR: 'INPUT_001',
  DATABASE_ERROR: 'DB_001',
} as const;
```

---

## Phase 4: API Validation (Priority: HIGH)

### 4.1 Zod Schemas for All Endpoints

Create shared validation schemas:
```typescript
// lib/validations/cohort.ts
import { z } from 'zod';

export const createCohortSchema = z.object({
  name: z.string().min(1).max(100),
  courseId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  maxLearners: z.number().int().positive().optional(),
});

export const updateCohortSchema = createCohortSchema.partial();
```

### 4.2 Validation Middleware
```typescript
// lib/api/validate.ts
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (req: NextRequest) => {
    const body = await req.json();
    return schema.parse(body);
  };
}
```

### 4.3 Endpoints Needing Validation
- [ ] `/api/cohorts/[id]/sessions` - CREATE/UPDATE
- [ ] `/api/cohorts/[id]/learners/[learnerId]/attendance`
- [ ] `/api/cohorts/[id]/iqa`
- [ ] `/api/upload`

---

## Phase 5: API Documentation (Priority: MEDIUM)

### 5.1 OpenAPI Specification
Generate from code using `next-swagger-doc` or manual spec.

### 5.2 Documentation Page
Add `/api-docs` page with Swagger UI.

---

## Tech Stack Additions

| Package | Purpose | Version |
|---------|---------|---------|
| `@sentry/nextjs` | Error tracking | ^8.0.0 |
| `jest` | Unit testing | ^29.0.0 |
| `@testing-library/react` | Component testing | ^14.0.0 |
| `supertest` | API testing | ^6.0.0 |
| `@playwright/test` | E2E testing | ^1.40.0 |
| `msw` | API mocking | ^2.0.0 |

---

## Success Criteria

1. **Testing**
   - [ ] >80% code coverage on API routes
   - [ ] All 23 API routes have tests
   - [ ] Integration tests for 3 main flows
   - [ ] E2E tests for critical paths

2. **CI/CD**
   - [ ] PR checks run in <5 minutes
   - [ ] All PRs require passing checks
   - [ ] Automatic deployment on merge

3. **Error Tracking**
   - [ ] All errors captured in Sentry
   - [ ] Source maps uploaded
   - [ ] Alerts configured for critical errors

4. **Validation**
   - [ ] All API inputs validated with Zod
   - [ ] Consistent error response format
   - [ ] Type-safe request/response

---

## Estimated Effort

| Phase | Hours | Loki Agents |
|-------|-------|-------------|
| Testing | 40 | eng-qa |
| CI/CD | 5 | ops-devops |
| Error Tracking | 4 | ops-monitor |
| Validation | 10 | eng-backend |
| Documentation | 10 | prod-techwriter |
| **Total** | **69** | |

---

## Out of Scope
- Performance optimization
- Database migrations
- New features
- UI changes
- Mobile app

---

**Purpose:** Improve reliability and maintainability of existing instructor dashboard through comprehensive testing and monitoring infrastructure.
