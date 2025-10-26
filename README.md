# 🔗 ShortLink – URL Shortening & QR Management Platform

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)
![NodeJS](https://img.shields.io/badge/Node.js-18%2B-green.svg)
![Express](https://img.shields.io/badge/ExpressJS-4.x-lightgrey.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-4%2B-brightgreen.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

> **A modern, scalable, and secure backend service for URL shortening, QR generation, and link analytics.**

---

## 🌟 Introduction

**ShortLink** is a backend API platform that powers the ShortLink web application.  
It provides core functionalities such as URL shortening, QR code generation, authentication, and analytics.  
Built with **Node.js**, **Express**, and **TypeScript**, it follows a clean modular architecture ensuring scalability, maintainability, and developer productivity.

---

## 🧠 Tech Stack

### **Backend**

![NodeJS](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![ExpressJS](https://img.shields.io/badge/ExpressJS-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![AWS S3](https://img.shields.io/badge/AWS%20S3-FF9900?style=flat-square&logo=amazonaws&logoColor=white)
![QRCode](https://img.shields.io/badge/QR--Code-000000?style=flat-square)
![Nodemailer](https://img.shields.io/badge/Nodemailer-0078D4?style=flat-square&logo=gmail&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-5E81AC?style=flat-square)
![Agenda](https://img.shields.io/badge/Agenda-Scheduler-blue?style=flat-square)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)

### **DevOps & Tools**

![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![Postman](https://img.shields.io/badge/Postman-FF6C37?style=flat-square&logo=postman&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=flat-square&logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=flat-square&logo=prettier&logoColor=black)
![Husky](https://img.shields.io/badge/Husky-git%20hooks-red?style=flat-square)

---

## ⚙️ Features

| Category                         | Description                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| 🔐 **Authentication**            | Secure login, registration, and token refresh using **JWT**.                       |
| 🔗 **URL Shortening (CRUD)**     | Create, update, retrieve, and delete short URLs with optional password protection. |
| 📷 **QR Code Generation**        | Generate downloadable QR codes for shortened URLs using built-in QR utilities.     |
| 🧾 **QR History Management**     | Track user QR scans and store them with pagination.                                |
| 📊 **Link Analytics**            | Count and visualize number of visits per alias.                                    |
| 🧠 **Rate Limiting**             | Prevent abuse with request throttling.                                             |
| 🧰 **Validation Layer**          | Schema validation via Zod and Joi equivalents.                                     |
| ☁️ **File & Image Storage**      | AWS S3 integration for uploaded assets.                                            |
| 📬 **Email Service**             | Nodemailer for password recovery and notifications.                                |
| 🧱 **ServiceResponse Model**     | Standard response structure across APIs.                                           |
| 🛡️ **Error Handling Middleware** | Centralized error management & logging.                                            |
| 🧩 **Modular Architecture**      | Each API (auth, user, url) is self-contained for clarity and scalability.          |

---

## 🏗️ Project Structure

```
📦 shortlink-backend/
├── src/
│   ├── api/
│   │   ├── auth/                # Authentication (JWT, login/register)
│   │   ├── url/                 # URL Shortening & QR
│   │   └── user/                # User management
│   ├── common/
│   │   ├── constant/            # Enums, messages, config
│   │   ├── middleware/          # Logger, rateLimiter, errorHandler
│   │   ├── models/              # Mongoose models & response objects
│   │   ├── services/            # Database & utility services
│   │   └── utils/               # Helper modules (JWT, email, QR, random, etc.)
│   ├── server.ts                # Express app setup
│   ├── index.ts                 # Entry point
│   └── type.d.ts                # Type declarations
├── Dockerfile
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp .env.example .env

# 3. Run development server
pnpm dev

# 4. Build production bundle
pnpm build

# 5. Start production server
pnpm start
```

---

## 🧩 API Overview

| Method   | Endpoint                | Description                       |
| -------- | ----------------------- | --------------------------------- |
| `POST`   | `/auth/register`        | Register new user                 |
| `POST`   | `/auth/login`           | User login                        |
| `POST`   | `/auth/refresh-token`   | Refresh JWT token                 |
| `GET`    | `/auth/forgot-password` | Send email forgot password        |
| `POST`   | `/auth/reset-password`  | Reset password                    |
| `POST`   | `/auth/logout`          | Logout to the application         |
| `GET`    | `/user/get-me`          | Get user information              |
| `POST`   | `/`                     | Create short URL                  |
| `GET`    | `/my-urls`              | Get list user’s URLs              |
| `PATCH`  | `/:alias`               | Update URL                        |
| `DELETE` | `/my-urls`              | Delete URL                        |
| `POST`   | `/qr-history`           | Save QR scan history              |
| `GET`    | `/:alias`               | Resolve short link to destination |
| `...`    | `....`                  | And more...                       |

---

## 🏗️ Architecture Overview

**ShortLink Backend** follows a **Layered Architecture** for better scalability:

- **Controller Layer** → Handles HTTP requests and responses.
- **Service Layer** → Core business logic and database operations.
- **Model Layer** → Mongoose schemas and document modeling.
- **Middleware Layer** → Security, validation, and logging.
- **Utility Layer** → Shared helpers (QR, JWT, Email, etc).

---

## 🧪 Testing

The project supports **integration tests** with Vitest.

```bash
# Run all tests
pnpm test

# Run a specific test
pnpm test src/api/user/__tests__/user.integration.test.ts
```

## 💎 Author & Contact

👨‍💻 **Project:** ShortLink
📧 **Contact:** shortlink.tool@gmail.com  
🌐 **Website:** [https://shortlinkz.online](https://shortlinkz.online)

---

> Made by duyaivy with 💖.
