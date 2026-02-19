# JusticeLynk Backend

> Production-ready NestJS + TypeScript backend for a global legal-tech SaaS platform.

[![NestJS](https://img.shields.io/badge/NestJS-v10-red?logo=nestjs)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-teal?logo=prisma)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-red?logo=redis)](https://redis.io)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-black?logo=socketdotio)](https://socket.io)

---

## ✨ Features

| Domain | Features |
|---|---|
| **Auth** | JWT access + refresh tokens, MFA (TOTP), backup codes, account locking |
| **RBAC** | Enterprise role-based permissions per org, Redis-cached, hierarchical |
| **Organizations** | Multi-tenant, member invites, owner/admin/member roles |
| **Cases** | Full case lifecycle, assignments, documents, audit updates |
| **Chat** | Real-time Socket.IO messaging, typing indicators, room-based |
| **Subscriptions** | Razorpay billing, plans with trial periods, per-org limits |
| **Payments** | Order creation, signature verification, webhook handling |
| **Professionals** | Marketplace, verification workflow, specializations |
| **Notifications** | In-app, real-time via Socket.IO, bulk sending |
| **Audit Logs** | Immutable, timestamped, per-org and per-user queries |
| **Admin** | Platform stats, user/org management, revenue breakdown |

---

## 🏗️ Tech Stack

- **Framework**: NestJS 10 (modular monolith, microservices-ready)
- **Language**: TypeScript 5
- **Database**: PostgreSQL 16 via Prisma ORM
- **Cache**: Redis 7 (permissions, subscription cache)
- **Auth**: JWT (access + refresh), Passport, TOTP MFA (speakeasy)
- **Real-time**: Socket.IO 4 (WebSocket gateway)
- **Payments**: Razorpay
- **Validation**: class-validator + class-transformer
- **Docs**: Swagger / OpenAPI
- **Security**: Helmet, rate limiting (throttler), bcrypt, CORS

---

## 📁 Project Structure

```
justice-lynk-backend/
├── prisma/
│   ├── schema.prisma          # 21+ models
│   └── seed.ts                # Seed super admin + plans + roles
├── src/
│   ├── config/                # App, DB, JWT, Redis, AWS, Payment configs
│   ├── common/
│   │   ├── constants/         # System, roles, permissions, socket events
│   │   ├── decorators/        # @Public, @CurrentUser, @OrgId, @Permission
│   │   ├── guards/            # JWT, Roles, Permissions (RBAC)
│   │   ├── interceptors/      # Response transform, logging
│   │   ├── filters/           # HTTP exception filter
│   │   └── utils/             # Pagination, crypto, response helpers
│   ├── database/
│   │   ├── prisma.service.ts  # PrismaClient with soft-delete helper
│   │   └── redis.service.ts   # Redis caching (permissions + subscriptions)
│   └── modules/
│       ├── auth/              # JWT auth, MFA, refresh tokens
│       ├── users/             # User profile management
│       ├── security/          # MFA management, session revocation
│       ├── professionals/     # Lawyer/mediator profiles + marketplace
│       ├── organizations/     # Multi-tenant orgs + invite system
│       ├── roles-permissions/ # Enterprise RBAC with Redis cache
│       ├── subscription/      # Plans, org subscriptions, trials
│       ├── payments/          # Razorpay integration + webhooks
│       ├── cases/             # Case lifecycle + assignments + documents
│       ├── chat/              # Socket.IO real-time messaging
│       ├── notifications/     # In-app notifications
│       ├── audit/             # Immutable audit trail
│       └── admin/             # Super admin platform management
├── Dockerfile                 # Multi-stage production build
├── docker-compose.yml         # Postgres + Redis + API
└── .env.example               # All environment variables documented
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16
- Redis 7
- npm or yarn

### 1. Clone & Install

```bash
git clone <repo-url>
cd justice-lynk-backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your DB, Redis, JWT secrets, Razorpay keys, etc.
```

**Required variables:**

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST` + `REDIS_PORT` | Redis connection |
| `JWT_SECRET` | Min 64 chars, cryptographically random |
| `JWT_REFRESH_SECRET` | Different from JWT_SECRET |
| `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` | Razorpay credentials |

### 3. Database Setup

```bash
# Run migrations
npx prisma migrate dev --name init

# Seed initial data (super admin, plans, roles)
npx prisma db seed
```

### 4. Run

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

API docs available at: **http://localhost:3000/api/docs**

---

## 🐳 Docker Deployment

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env ...

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f api
```

This starts:
- PostgreSQL 16 on port 5432
- Redis 7 on port 6379
- JusticeLynk API on port 3000

---

## 🔌 API Overview

All routes are prefixed `/api/v1/`:

| Module | Base Path | Auth |
|---|---|---|
| Auth | `/api/v1/auth` | Public (register/login) |
| Users | `/api/v1/users` | JWT required |
| Security | `/api/v1/security` | JWT required |
| Professionals | `/api/v1/professionals` | JWT required |
| Organizations | `/api/v1/organizations` | JWT required |
| Roles & Permissions | `/api/v1/roles` | JWT required |
| Subscriptions | `/api/v1/subscriptions` | JWT required |
| Payments | `/api/v1/payments` | JWT required |
| Cases | `/api/v1/cases` | JWT required |
| Chat (REST) | `/api/v1/chat` | JWT required |
| Notifications | `/api/v1/notifications` | JWT required |
| Audit | `/api/v1/audit` | JWT required |
| Admin | `/api/v1/admin` | Super Admin only |

### Real-time Chat (Socket.IO)

Connect to `ws://<host>/chat` with:

```json
{ "auth": { "token": "<access_token>" } }
```

**Events:**

| Event (client→server) | Payload |
|---|---|
| `join_room` | `{ caseId }` |
| `send_message` | `{ caseId, content, type? }` |
| `typing` | `{ caseId }` |
| `stop_typing` | `{ caseId }` |

| Event (server→client) | Payload |
|---|---|
| `new_message` | Full message object |
| `user_typing` | `{ userId, caseId }` |
| `user_online` | `{ userId }` |
| `user_offline` | `{ userId }` |

---

## 🔐 Authentication Flow

```
Register → POST /api/v1/auth/register
Login    → POST /api/v1/auth/login
         ↓ if MFA enabled:
           POST /api/v1/auth/mfa/verify   (TOTP)
           POST /api/v1/auth/mfa/backup-code
         ↓
Refresh  → POST /api/v1/auth/refresh  (Bearer: <refresh_token>)
Logout   → POST /api/v1/auth/logout
```

---

## 📦 Default Credentials (after seed)

| Field | Value |
|---|---|
| Email | `admin@justicelynk.com` |
| Password | `Admin@JL2024!` |

> ⚠️ **Change the admin password immediately after first login!**

---

## 🧪 Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:e2e

# Coverage report
npm run test:cov
```

---

## 📖 Swagger Docs

Available in development and staging at:
```
http://localhost:3000/api/docs
```

Includes all endpoints with request/response schemas, authentication, and examples.

---

## 🔧 NPM Scripts

| Script | Description |
|---|---|
| `npm run start:dev` | Development server (watch mode) |
| `npm run build` | Compile TypeScript |
| `npm run start:prod` | Run compiled output |
| `npm run lint` | Lint codebase |
| `npm run format` | Prettier format |
| `npm run test` | Unit tests |
| `npm run test:e2e` | E2E tests |
| `npx prisma studio` | Visual DB browser |
| `npx prisma migrate dev` | Create + apply migration |
| `npx prisma db seed` | Run seed script |

---

## 📝 License

MIT © JusticeLynk 2024
