# Bamboo Instructor Dashboard - Authentication & User Management System

## Executive Summary

This document outlines the complete authentication and user management system for the Bamboo Bicycle Club Instructor Dashboard, including role-based access control (RBAC) with tiered permissions for read-only and editing access.

---

## Customer Journey Map

### 1. Initial Discovery & Registration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CUSTOMER JOURNEY                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  1. LANDING PAGE                                                              │
│     ├── View public course information                                        │
│     ├── See pricing/enrollment options                                        │
│     └── "Login" / "Get Started" buttons                                       │
│                                                                               │
│  2. REGISTRATION FLOW                                                         │
│     ├── Email signup (primary)                                                │
│     ├── Social login (Google, optional)                                       │
│     ├── Email verification                                                    │
│     └── Profile completion (name, organization)                               │
│                                                                               │
│  3. POST-REGISTRATION                                                         │
│     ├── Welcome onboarding (first-time users)                                 │
│     ├── Role assignment (by admin or auto)                                    │
│     └── Course enrollment/assignment                                          │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Login Experience

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LOGIN FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  /login                                                                       │
│     │                                                                         │
│     ├── Email/Password form                                                   │
│     │   ├── "Remember me" checkbox                                            │
│     │   ├── "Forgot password" link                                            │
│     │   └── Submit → Validate → Create session                                │
│     │                                                                         │
│     ├── Social Login (optional)                                               │
│     │   └── Google OAuth → Link/Create account                                │
│     │                                                                         │
│     └── Error States                                                          │
│         ├── Invalid credentials                                               │
│         ├── Account not verified                                              │
│         ├── Account suspended                                                 │
│         └── Too many attempts (rate limiting)                                 │
│                                                                               │
│  SUCCESS → Redirect to /dashboard or intended page                            │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3. Role-Based Dashboard Experience

#### Admin Dashboard
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ADMIN DASHBOARD (/admin)                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Total Users  │  │  Instructors │  │   Students   │  │ Active Today │     │
│  │     156      │  │      12      │  │     144      │  │      23      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                                               │
│  Navigation:                                                                  │
│  ├── User Management                                                          │
│  │   ├── View all users                                                       │
│  │   ├── Create new user                                                      │
│  │   ├── Edit user roles/permissions                                          │
│  │   ├── Suspend/activate accounts                                            │
│  │   └── Bulk actions                                                         │
│  │                                                                            │
│  ├── Course Management                                                        │
│  │   ├── Enable/disable courses                                               │
│  │   ├── Assign instructors to courses                                        │
│  │   └── View course analytics                                                │
│  │                                                                            │
│  ├── Enrollment Management                                                    │
│  │   ├── Enroll students in courses                                           │
│  │   ├── Batch enrollment via CSV                                             │
│  │   └── Send enrollment invitations                                          │
│  │                                                                            │
│  └── Settings                                                                 │
│      ├── Organization settings                                                │
│      ├── Email templates                                                      │
│      └── Security settings                                                    │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Instructor Dashboard
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  INSTRUCTOR DASHBOARD (/dashboard)                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Welcome back, [Name]!                                                        │
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                        │
│  │ My Courses   │  │ My Students  │  │  Progress    │                        │
│  │      3       │  │      24      │  │    67%       │                        │
│  └──────────────┘  └──────────────┘  └──────────────┘                        │
│                                                                               │
│  Navigation:                                                                  │
│  ├── My Courses (assigned courses)                                            │
│  │   ├── Course content (full access)                                         │
│  │   ├── View/edit lesson notes                                               │
│  │   └── Download resources                                                   │
│  │                                                                            │
│  ├── My Students                                                              │
│  │   ├── View enrolled students                                               │
│  │   ├── Track student progress                                               │
│  │   └── Mark attendance/completion                                           │
│  │                                                                            │
│  ├── Resources & Materials                                                    │
│  │   ├── Handbooks                                                            │
│  │   ├── Assessment guides                                                    │
│  │   └── Health & safety docs                                                 │
│  │                                                                            │
│  └── My Progress                                                              │
│      └── Track personal course completion                                     │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Student Dashboard (Read-Only)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STUDENT DASHBOARD (/dashboard)                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Welcome, [Name]!                                                             │
│                                                                               │
│  ┌─────────────────────────────────────────────┐                             │
│  │ Your Learning Progress                       │                             │
│  │ ████████████░░░░░░░░  67% Complete          │                             │
│  └─────────────────────────────────────────────┘                             │
│                                                                               │
│  Navigation:                                                                  │
│  ├── My Courses (enrolled courses only)                                       │
│  │   ├── View course content (READ-ONLY)                                      │
│  │   ├── Track personal progress                                              │
│  │   └── Mark lessons as complete                                             │
│  │                                                                            │
│  ├── Resources                                                                │
│  │   └── View assigned resources                                              │
│  │                                                                            │
│  └── Profile                                                                  │
│      ├── Update personal info                                                 │
│      └── Change password                                                      │
│                                                                               │
│  Restrictions:                                                                │
│  ✗ Cannot edit course content                                                 │
│  ✗ Cannot access admin features                                               │
│  ✗ Cannot view other students' progress                                       │
│  ✗ Cannot download instructor-only materials                                  │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## User Roles & Permissions Matrix

### Role Definitions

| Role | Description | Use Case |
|------|-------------|----------|
| **SUPER_ADMIN** | Full system access | Platform owner/tech admin |
| **ADMIN** | Organization admin | Bamboo Bicycle Club management |
| **INSTRUCTOR** | Course facilitator | Teachers delivering courses |
| **STUDENT** | Course participant | Learners enrolled in courses |
| **GUEST** | Public visitor | Unauthenticated browsing |

### Permission Matrix

| Permission | Super Admin | Admin | Instructor | Student | Guest |
|------------|:-----------:|:-----:|:----------:|:-------:|:-----:|
| **Users** |
| View all users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit any user | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Assign roles | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Courses** |
| View all courses | ✅ | ✅ | ✅* | ❌ | ❌ |
| View assigned courses | ✅ | ✅ | ✅ | ✅ | ❌ |
| Enable/disable courses | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assign instructors | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Content** |
| View lesson content | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit lesson notes | ✅ | ✅ | ✅ | ❌ | ❌ |
| Download all resources | ✅ | ✅ | ✅ | ❌ | ❌ |
| Download student resources | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Progress** |
| View own progress | ✅ | ✅ | ✅ | ✅ | ❌ |
| View all progress | ✅ | ✅ | ✅* | ❌ | ❌ |
| Mark own completion | ✅ | ✅ | ✅ | ✅ | ❌ |
| Mark others' completion | ✅ | ✅ | ✅* | ❌ | ❌ |
| **System** |
| Access admin panel | ✅ | ✅ | ❌ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ✅* | ❌ | ❌ |
| Manage settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Force cache refresh | ✅ | ✅ | ❌ | ❌ | ❌ |

*\* Instructors: Only for their assigned courses/students*

---

## Database Schema Design

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATABASE SCHEMA                                        │
├─────────────────────────────────────────────────────────────────────────────┤

┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│    User       │     │   Session     │     │   Account     │
├───────────────┤     ├───────────────┤     ├───────────────┤
│ id            │────<│ userId        │     │ userId        │>────┐
│ email         │     │ sessionToken  │     │ provider      │     │
│ name          │     │ expires       │     │ accessToken   │     │
│ password      │     └───────────────┘     │ refreshToken  │     │
│ emailVerified │                           └───────────────┘     │
│ image         │                                                  │
│ role          │>────────────────────────────────────────────────┘
│ createdAt     │
│ updatedAt     │
└───────────────┘
        │
        │ 1:N
        ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ Enrollment    │     │   Course      │     │CourseInstructor│
├───────────────┤     ├───────────────┤     ├───────────────┤
│ id            │     │ id            │     │ id            │
│ userId        │>────│ slug          │<────│ courseId      │
│ courseId      │<────│ title         │     │ userId        │>────┐
│ enrolledAt    │     │ enabled       │     │ assignedAt    │     │
│ completedAt   │     │ notionNavId   │     └───────────────┘     │
│ status        │     │ createdAt     │                           │
└───────────────┘     └───────────────┘                           │
                              │                                    │
                              │ 1:N                                │
                              ▼                                    │
                      ┌───────────────┐                           │
                      │ LessonProgress│                           │
                      ├───────────────┤                           │
                      │ id            │                           │
                      │ userId        │>──────────────────────────┘
                      │ lessonId      │
                      │ courseId      │
                      │ completedAt   │
                      │ notes         │
                      └───────────────┘

└─────────────────────────────────────────────────────────────────────────────┘
```

### Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// AUTH.JS REQUIRED MODELS
// ============================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  password      String?   // Hashed, nullable for OAuth
  image         String?
  role          Role      @default(STUDENT)

  // Relations
  accounts          Account[]
  sessions          Session[]
  enrollments       Enrollment[]
  instructorCourses CourseInstructor[]
  lessonProgress    LessonProgress[]

  // Metadata
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  lastLoginAt DateTime?
  isActive  Boolean  @default(true)

  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ============================================
// APPLICATION MODELS
// ============================================

enum Role {
  SUPER_ADMIN
  ADMIN
  INSTRUCTOR
  STUDENT
}

enum EnrollmentStatus {
  PENDING
  ACTIVE
  COMPLETED
  SUSPENDED
}

model Course {
  id          String   @id @default(cuid())
  slug        String   @unique
  title       String
  shortTitle  String?
  description String?  @db.Text
  icon        String?
  color       String   @default("green")
  notionNavId String
  enabled     Boolean  @default(true)

  // Relations
  enrollments  Enrollment[]
  instructors  CourseInstructor[]
  progress     LessonProgress[]

  // Metadata
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("courses")
}

model CourseInstructor {
  id         String   @id @default(cuid())
  courseId   String
  userId     String
  assignedAt DateTime @default(now())
  isPrimary  Boolean  @default(false)

  course Course @relation(fields: [courseId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([courseId, userId])
  @@map("course_instructors")
}

model Enrollment {
  id          String           @id @default(cuid())
  userId      String
  courseId    String
  status      EnrollmentStatus @default(PENDING)
  enrolledAt  DateTime         @default(now())
  completedAt DateTime?

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  course Course @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@unique([userId, courseId])
  @@map("enrollments")
}

model LessonProgress {
  id          String   @id @default(cuid())
  userId      String
  courseId    String
  lessonId    String   // Notion page ID
  completedAt DateTime @default(now())
  notes       String?  @db.Text // Instructor notes

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  course Course @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@unique([userId, lessonId])
  @@map("lesson_progress")
}

// ============================================
// AUDIT & LOGGING (Optional)
// ============================================

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String
  entity    String
  entityId  String?
  details   Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())

  @@map("audit_logs")
}
```

---

## Technical Architecture

### Recommended Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Authentication** | Auth.js (NextAuth v5) | Open source, no vendor lock-in, Next.js native |
| **Database** | PostgreSQL + Prisma | Industry standard, type-safe, good tooling |
| **Session Strategy** | JWT + Database hybrid | Edge-compatible, revocable sessions |
| **Password Hashing** | bcrypt | Industry standard, battle-tested |
| **Email** | Resend or SendGrid | Transactional emails for verification |

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤

  ┌──────────────────┐
  │   Login Page     │
  │  (/auth/login)   │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐     ┌──────────────────┐
  │  Auth.js API     │────>│  Prisma Adapter  │
  │ (/api/auth/[...])│     │                  │
  └────────┬─────────┘     └────────┬─────────┘
           │                        │
           │                        ▼
           │               ┌──────────────────┐
           │               │   PostgreSQL     │
           │               │   Database       │
           │               └──────────────────┘
           │
           ▼
  ┌──────────────────┐
  │  Session Created │
  │  (JWT + Cookie)  │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐     ┌──────────────────┐
  │   Middleware     │────>│  Role Check      │
  │  (auth guard)    │     │  Permission Check│
  └────────┬─────────┘     └──────────────────┘
           │
           ▼
  ┌──────────────────┐
  │  Protected Page  │
  │  (Role-based UI) │
  └──────────────────┘

└─────────────────────────────────────────────────────────────────────────────┘
```

### Route Protection Strategy

```typescript
// middleware.ts
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Public routes
  const publicRoutes = ["/", "/auth/login", "/auth/register", "/auth/verify"]
  if (publicRoutes.includes(pathname)) return NextResponse.next()

  // Require authentication
  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", req.url))
  }

  // Admin routes
  if (pathname.startsWith("/admin")) {
    if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Set up PostgreSQL database (Vercel Postgres or Supabase)
- [ ] Install and configure Prisma
- [ ] Implement Auth.js with email/password
- [ ] Create basic login/register pages
- [ ] Add email verification

### Phase 2: User Management (Week 2-3)
- [ ] Create admin user management pages
- [ ] Implement role assignment
- [ ] Build enrollment system
- [ ] Add course-instructor assignment

### Phase 3: Access Control (Week 3-4)
- [ ] Implement middleware route protection
- [ ] Add permission checks to components
- [ ] Create role-based navigation
- [ ] Migrate progress from localStorage to database

### Phase 4: Polish & Security (Week 4-5)
- [ ] Add password reset flow
- [ ] Implement rate limiting
- [ ] Add audit logging
- [ ] Security testing and hardening
- [ ] User onboarding experience

---

## File Structure (After Implementation)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── verify/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx (authenticated layout)
│   │   ├── page.tsx (dashboard home)
│   │   └── courses/[courseSlug]/...
│   ├── admin/
│   │   ├── layout.tsx (admin layout)
│   │   ├── page.tsx (admin dashboard)
│   │   ├── users/
│   │   │   ├── page.tsx (user list)
│   │   │   └── [userId]/page.tsx (user detail)
│   │   ├── courses/
│   │   │   └── page.tsx (course management)
│   │   └── enrollments/
│   │       └── page.tsx (enrollment management)
│   └── api/
│       └── auth/[...nextauth]/route.ts
├── lib/
│   ├── auth.ts (Auth.js config)
│   ├── db.ts (Prisma client)
│   ├── permissions.ts (RBAC utilities)
│   └── ...
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── UserMenu.tsx
│   └── ...
└── prisma/
    └── schema.prisma
```

---

## Security Considerations

### Password Security
- Minimum 8 characters, require complexity
- bcrypt hashing with cost factor 12
- Never log or expose plain passwords
- Implement account lockout after 5 failed attempts

### Session Security
- HttpOnly, Secure, SameSite=Lax cookies
- 24-hour session expiry (configurable)
- Session revocation on password change
- CSRF protection via Auth.js

### Data Protection
- Encrypt sensitive data at rest
- Use HTTPS everywhere
- Sanitize all user inputs
- Implement rate limiting on auth endpoints

---

## Sources & References

### Authentication
- [Auth.js Documentation](https://authjs.dev/guides/role-based-access-control)
- [Clerk Complete Authentication Guide](https://clerk.com/articles/complete-authentication-guide-for-nextjs-app-router)
- [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication)

### RBAC Implementation
- [Clerk RBAC Documentation](https://clerk.com/docs/references/nextjs/basic-rbac)
- [Building Scalable RBAC in Next.js](https://medium.com/@muhebollah.diu/building-a-scalable-role-based-access-control-rbac-system-in-next-js-b67b9ecfe5fa)
- [Permit.io RBAC Guide](https://www.permit.io/blog/how-to-add-rbac-in-nextjs)

### Database & Prisma
- [Prisma + Auth.js + Next.js Guide](https://www.prisma.io/docs/guides/authjs-nextjs)
- [Vercel Prisma Postgres Starter](https://vercel.com/templates/next.js/prisma-postgres)

### LMS UX Best Practices
- [LMS UI/UX Design Tips](https://riseapps.co/lms-ui-ux-design/)
- [LMS User Experience Guide](https://www.docebo.com/learning-network/blog/lms-user-experience/)
- [Lazarev LMS UX Article](https://www.lazarev.agency/articles/lms-ux)
