# 🔗 ShortLink – URL Shortening & QR Management Platform (Backend)

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)
![NodeJS](https://img.shields.io/badge/Node.js-20%2B-green.svg)
![NestJS](https://img.shields.io/badge/NestJS-12.x-red.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)
![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-4%2B-brightgreen.svg)
![Redis](https://img.shields.io/badge/Redis-ioredis-DC382D.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

> **A high-performance, scalable, and secure NestJS backend service for URL shortening, direct 302 redirects, batch analytics, and QR management following Clean Architecture.**

---

## 🌟 Introduction

**ShortLink Backend** is a modern RESTful API platform built with **NestJS 12**, **TypeScript**, **Prisma ORM**, and **Redis**.  
It implements high-performance architectural patterns outlined in [architecture.md](file:///Users/apple/QUOCDUY/PROJECT/SHORTLINK/SHORTEN_URL/architecture.md), including **Base62 Key Generation (KGS)**, **Direct HTTP 302 Redirects**, **In-Memory Redis Caching with Null-Cache protection**, and **Async Batch Analytics Flushing**.

---

## 🧠 Tech Stack

### **Core Backend & Framework**
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=flat-square&logo=swagger&logoColor=black)

### **Security & Validation**
![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![Argon2](https://img.shields.io/badge/Argon2-00599C?style=flat-square)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white)
![Pino](https://img.shields.io/badge/Pino-Logger-000000?style=flat-square)

### **DevOps & Testing**
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)
![PNPM](https://img.shields.io/badge/PNPM-F69220?style=flat-square&logo=pnpm&logoColor=white)

---

## ⚙️ Features & Architecture Compliance

| Feature / Category | Technical Implementation |
| :--- | :--- |
| 🚀 **High Speed 302 Redirect** | Direct HTTP 302 redirection for zero-latency link resolution. Crawlers follow 302 directly to target. |
| ⚡ **Base62 & Key Generation (KGS)** | Generates unique 7-character short codes using Base62 algorithm for $O(1)$ database lookup. |
| 💾 **In-Memory Caching (Redis)** | Caches `alias` → `long_url` and metadata with LRU eviction and 60s Null Value Caching against DB cache penetration. |
| 📊 **Batch Analytics Queue** | Non-blocking Redis `INCR views:{alias}` per hit; `AnalyticsFlushScheduler` flushes counts to DB every 30s. |
| 🔐 **Authentication & Security** | JWT access/refresh tokens, Argon2 password hashing, and NestJS Throttler for Rate Limiting. |
| 📷 **QR Scan History** | Stores user QR generation and scan history with pagination. |
| 🛡️ **Clean Architecture** | Divided into Domain, Application, Infrastructure, and Presentation layers for maintainability. |

---

## 🏗️ Project Structure

```
📦 SHORTEN_URL/
├── prisma/
│   └── schema.prisma            # Prisma Schema (Users, ShortUrls, RefreshTokens, QrHistories)
├── src/
│   ├── modules/                 # Clean Architecture Domain Modules
│   │   ├── auth/                # Authentication & Session Management
│   │   │   ├── application/     # Auth Use Cases, DTOs & Services
│   │   │   ├── domain/          # User & Token Entities / Interfaces
│   │   │   ├── infrastructure/  # Token Verification, Password Hashing & Repositories
│   │   │   └── presentation/    # Auth Controller & REST Endpoints
│   │   └── short-url/           # URL Shortening, Redirection & Analytics
│   │       ├── application/     # Shortening Use Cases, AnalyticsFlushScheduler
│   │       ├── domain/          # Base62 Generator & URL Entity Rules
│   │       ├── infrastructure/  # Redis Cache Layer & Prisma Repositories
│   │       └── presentation/    # Direct 302 Redirect & CRUD Controllers
│   ├── shared/                  # Cross-cutting Modules & Infrastructure
│   │   ├── config/              # Environment & App Configuration
│   │   ├── filters/             # Global HTTP Exception Filters
│   │   ├── responses/           # Standard Service Response Envelope
│   │   ├── services/            # Shared PrismaService & RedisService
│   │   ├── types/               # Type Definitions
│   │   └── utils/               # Common Helper Utilities
│   ├── app.controller.ts        # Root Health Check Controller
│   ├── app.module.ts            # Root Application Module
│   └── main.ts                  # Application Entrypoint, Validation Pipe & Swagger Setup
├── test/                        # Vitest Integration & E2E Test Suites
├── architecture.md              # System Architecture & Implementation Blueprint
├── docker-compose.local.yml     # Local Development Stack (MongoDB, Redis, App)
├── docker-compose.vps2.yml      # Production Deployment Stack
├── Dockerfile                   # Production Container Spec
└── package.json
```

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Setup environment variables
cp .env.example .env

# 3. Generate Prisma client & sync database
npx prisma generate
npx prisma db push

# 4. Start NestJS dev server (with hot reload)
pnpm start:dev

# 5. Build for production
pnpm build

# 6. Start production server
pnpm start:prod
```

---

## 🧩 API Overview

> **Base Path:** All API routes are prefixed with `/api` (except `/health` and redirect `GET /view/:alias`). Swagger documentation is available at `/docs`.

### 🔑 Authentication (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | User registration |
| `POST` | `/api/auth/login` | User login (returns JWT tokens via HTTP-only cookies) |
| `GET` | `/api/auth/oauth` | Google OAuth2 authentication |
| `GET` | `/api/auth/me` | Fetch active user profile |
| `POST` | `/api/auth/refresh-token` | Refresh JWT access token |
| `GET` | `/api/auth/forgot-password` | Send password reset email |
| `POST` | `/api/auth/reset-password` | Reset password using token |

### 🔗 Short URLs (`/api`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/:alias` *(Proxy ➔ `/view/:alias`)* | **Direct HTTP 302 Redirect** to target URL or password page |
| `POST` | `/api` | Create new short URL (supports anonymous & authenticated) |
| `POST` | `/api/view/:alias` | Get password-protected short URL details |
| `GET` | `/api/my-urls` | List authenticated user's short links (paginated) |
| `PATCH` | `/api/my-urls/active` | Batch update active/inactive status of links |
| `DELETE` | `/api/my-urls` | Batch delete short links by ID list |
| `PATCH` | `/api/:alias` | Update existing short link configuration |

### 📱 QR History & Utilities (`/api`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/qr-history` | Create QR scan history record |
| `GET` | `/api/qr-history` | List QR scan history (paginated) |
| `DELETE` | `/api/qr-history` | Batch delete QR scan history records |
| `POST` | `/api/view/recaptcha` | Verify reCAPTCHA token |
| `GET` | `/health` | Health check endpoint |

---

## 🏗️ Architecture Blueprint Compliance

Refer to [`architecture.md`](file:///Users/apple/QUOCDUY/PROJECT/SHORTLINK/SHORTEN_URL/architecture.md) for full architectural guidelines:

1. **ID Generation (Base62 + KGS)**:
   - Uses **Base62** (`a-z`, `A-Z`, `0-9`) encoding for 7-character short links (~3.5 trillion unique keys).
2. **Read-Heavy Caching Strategy**:
   - Redis caches `alias` → `long_url` mapping.
   - **LRU Eviction** for memory optimization + **60s Null Caching** to prevent Cache Penetration.
3. **Async Batch Tracking**:
   - High-throughput Redis `INCR views:{alias}` counters.
   - `AnalyticsFlushScheduler` runs asynchronously every 30s to commit accumulated click counts to DB in batch transactions.
4. **Security & Rate Limiting**:
   - NestJS Throttler Guard powered by Redis to enforce token bucket rate limits per client IP.

---

## 🧪 Testing

The project uses **Vitest** for fast unit and integration testing.

```bash
# Run unit & integration tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run E2E tests
pnpm test:e2e
```

---

## 💎 Author & Contact

👨‍💻 **Project:** ShortLink <br>
📧 **Contact:** shortlink.tool@gmail.com  
🌐 **Website:** [https://shortlinkz.online](https://shortlinkz.online)

---

> Made by duyaivy with 💖.
