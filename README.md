<div align="center">

# 🎉 Evently

**A centralized, full-stack event management platform built for college fests — bringing order to the chaos of Google Forms, scattered spreadsheets, and WhatsApp confirmations.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=white)](https://vitejs.dev)
[![Express](https://img.shields.io/badge/Express.js-Backend-000000?logo=express&logoColor=white)](https://expressjs.com)
[![JWT](https://img.shields.io/badge/Auth-JWT%20%2B%20httpOnly%20Cookies-orange)](https://jwt.io)

**[🚀 Live Demo](https://dassassignment1-frontend.vercel.app)** • **[📡 API Base](https://dassassignment1.onrender.com/api)**

> ⚠️ Backend is on Render's free tier — first request may take 30–60 seconds to cold-start.

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Role System](#-role-system)
- [Feature Breakdown](#-feature-breakdown)
- [Tech Stack & Justifications](#-tech-stack--justifications)
- [Advanced Features (Part 2)](#-advanced-features-part-2)
- [Data Models](#-data-models)
- [Project Structure](#-project-structure)
- [Local Setup](#-local-setup)
- [Environment Variables](#-environment-variables)
- [API Overview](#-api-overview)
- [Deployment](#-deployment)

---

## 🧭 Overview

Evently is a full-stack MERN event management system designed for **Felicity**, IIIT Hyderabad's annual fest. It replaces the traditional chaos of midnight Google Forms, untracked spreadsheets, and payment screenshots with a structured, role-based platform where:

- **Participants** discover events, register individually or in teams, receive QR-coded tickets via email, and track their participation history.
- **Organizers** create and publish events with custom registration forms, manage registrations, verify payments, track attendance via QR scanner, and push Discord notifications.
- **Admins** provision organizer accounts, oversee the platform, manage password reset requests, and maintain system integrity.

---

## 👥 Role System

Each user account holds **exactly one role** — switching roles is prohibited by design.

| Role | Who | Key Capabilities |
|---|---|---|
| **Admin** | System administrator (seeded via backend) | Create/disable organizer accounts, approve password resets, platform oversight |
| **Organizer** | Clubs, councils, fest teams | Create events, custom forms, manage registrations, QR attendance, Discord webhook |
| **Participant** | IIIT students & external attendees | Browse & register for events, team formation, QR ticket via email, discussion forums |

---

## ✨ Feature Breakdown

### 🔐 Authentication & Security

| Feature | Details |
|---|---|
| **IIIT Email Validation** | IIIT participants must register with a verified IIIT-issued email domain |
| **External Participant Registration** | Non-IIIT users register via email + password |
| **Organizer Provisioning** | No self-registration; Admin creates organizer accounts with auto-generated credentials |
| **Admin Seeding** | Admin is the first user; provisioned entirely via backend environment variables — no UI registration |
| **Password Hashing** | All passwords hashed with `bcrypt` — no plaintext storage at any layer |
| **JWT + httpOnly Cookies** | Stateless auth with XSS-resistant httpOnly cookie transport, environment-aware cross-origin support |
| **Role-Based Access Control** | Every frontend route and backend endpoint is protected by role middleware |
| **Session Persistence** | Sessions survive browser restarts; logout explicitly clears all tokens |
| **Bot Protection** | CAPTCHA verification on login and registration pages via hCaptcha widget |

---

### 🙋 Participant Features

| Feature | Details |
|---|---|
| **Onboarding Preferences** | Post-signup selection of interests and clubs to follow; skippable and editable later |
| **Dashboard** | Upcoming registered events with tabs: Normal, Merchandise, Completed, Cancelled/Rejected |
| **Browse Events** | Fuzzy + partial search on event/organizer names; filters by type, eligibility, date range, followed clubs; Trending (Top 5 / 24h) |
| **Event Detail Page** | Full event info, registration/purchase button with validation; blocked when deadline passes or capacity is exhausted |
| **Normal Event Registration** | Fills dynamic custom form; receives QR-coded ticket via email with unique UUID ticket ID |
| **Merchandise Purchase** | Select size/variant → upload payment proof → pending approval → QR ticket on approval |
| **Hackathon Team Registration** | Create a team, set size, share invite link/code; ticket auto-generated for all members on team completion |
| **Profile Page** | Edit name, contact, interests, followed clubs; view non-editable fields (email, participant type); change password |
| **Clubs/Organizers Page** | Browse all organizers; follow/unfollow; view upcoming and past events per organizer |
| **Discussion Forum** | Real-time per-event forum for registered participants; thread replies, message reactions, organizer announcements |
| **Add to Calendar** | Export registered events as `.ics` files; direct links for Google Calendar and Microsoft Outlook |

---

### 🎛️ Organizer Features

| Feature | Details |
|---|---|
| **Dashboard** | Events carousel with status badges (Draft/Published/Ongoing/Closed); analytics across all completed events |
| **Event Lifecycle** | Create (Draft) → Publish → Ongoing → Close/Complete; each stage has defined edit permissions |
| **Custom Form Builder** | Drag-and-drop field ordering; supports text, dropdown, checkbox, file upload; mark fields required/optional; locked after first registration |
| **Event Analytics** | Per-event stats: registrations, sales, revenue, attendance rate |
| **Participant Management** | Full registrant list with name, email, reg date, payment status, attendance; search/filter; export as CSV |
| **Merchandise Payment Approval** | Separate tab showing uploaded payment proofs; approve/reject with status tracking; QR ticket generated only on approval |
| **QR Scanner & Attendance** | Built-in camera scanner or file upload; marks attendance with timestamp; rejects duplicate scans; live dashboard; CSV export; manual override |
| **Discord Webhook** | Auto-posts new event announcements to a configured Discord channel on publish and creation |
| **Password Reset Workflow** | Request reset via Admin; Admin approves/rejects with comments; system auto-generates new password |
| **Organizer Profile** | Editable name, category, description, contact; configure Discord webhook URL |

---

## 🛠️ Tech Stack & Library Justifications

| Library | Purpose | Why Chosen |
|---|---|---|
| **Express** | HTTP framework | Minimal, well-documented, middleware-first architecture ideal for REST APIs |
| **MongoDB + Mongoose** | Database + ODM | Flexible document model handles dynamic event schemas, custom forms, and nested merchandise variants without rigid migrations |
| **JWT + httpOnly cookies** | Stateless authentication | SPA-compatible, XSS-resistant with cookie transport, works across cross-origin Vercel/Render deployment |
| **bcrypt** | Password hashing | Industry-standard adaptive hashing with configurable salt rounds for password security |
| **Nodemailer** | Email transport | SMTP-based ticket emails with embedded QR codes as CID attachments for reliable delivery |
| **Fuse.js** | Fuzzy search | Lightweight client-side fuzzy search for event discovery without requiring a search engine like Elasticsearch |
| **Joi** | Input validation | Declarative schema validation on all API endpoints — clean, composable, and readable |
| **qrcode** | QR code generation | Generates data-URL QR images embedded directly in ticket emails for venue entry scanning |
| **Socket.IO** | Real-time communication | WebSocket-based bidirectional channel for live discussion forum messages with automatic reconnection |
| **nanoid + uuid** | ID generation | Generates unique ticket IDs and team invite codes with collision resistance |
| **json2csv** | CSV export | Fast, streaming CSV generation for organizer participant lists |

---

## 🚀 Advanced Features (Part 2)

### Tier A (Choose 2)

#### A1 — Hackathon Team Registration
Team-based registration for normal events. Participants create a team (with a name and size limit), share an auto-generated invite code with teammates, and the team leader finalizes registration once the team is full. All members receive individual ticket emails with QR codes.

* **Implementation**: `Team` model tracks members, invite codes, and team status (`forming` → `complete` → `registered`). The `TeamSection` component on EventDetails handles the full flow. Backend enforces team size limits and prevents duplicate membership.

#### A2 — Merchandise Payment Approval Workflow
Merchandise orders are created in a `pending` state — no QR ticket is issued. Participants upload payment proof (screenshot URL), and organizers review/approve/reject from a dedicated approvals dashboard. On approval, stock is decremented atomically, a QR ticket is generated, and a confirmation email is sent. Rejected orders include a reason and participants can re-upload proof.

* **Implementation**: `Registration.paymentStatus` tracks the approval lifecycle (`pending` → `approved`/`rejected`). The `OrganizerMerchandiseApprovals` page provides filtering and bulk review. `organizerController.approveMerchandise` handles the atomic stock decrement + QR generation.

---

### Tier B (Choose 2)

#### B1 — Real-Time Discussion Forum
Live, threaded discussion forum per event powered by Socket.IO. Features include: message threading (reply to specific messages), emoji reactions (👍 🎉 ❤️ ❓), message pinning/unpinning by organizers, organizer-only announcements, and soft-delete. Only registered participants and organizers can post; all users can view. Pinned messages are displayed separately at the top.

* **Implementation**: `ForumMessage` model with Socket.IO rooms per event (`forum:<eventId>`). The `DiscussionForum` component manages real-time message sync, scroll-aware unread indicators, and auto-scroll to latest. Backend `forumController` handles CRUD with role-based permissions for pin/delete.

#### B2 — Organizer Password Reset Workflow
Admin-mediated password reset for organizers. Organizers can request a reset from both the login page (when locked out) and their profile (when logged in). Requests include a reason and are queued for admin review. Admins approve (auto-generates new password, sent via email) or reject from a dedicated dashboard.

* **Implementation**: `User.passwordResetRequests` array stores pending requests with status tracking. `OrganizerForgotPassword` page provides the public-facing request form. `AdminPasswordResets` page manages the queue. On approval, `adminController.handlePasswordReset` generates a secure password, hashes it, and sets `mustChangePassword: true` forcing a change on next login.

---

### Tier C (Choose 1)

#### C3 — Bot Protection (hCaptcha)
hCaptcha integration on login and signup forms to prevent automated account creation and credential stuffing. Uses the `@hcaptcha/react-hcaptcha` widget on the frontend with server-side token verification via the hCaptcha API. Configurable via environment variables (`HCAPTCHA_SECRET_KEY` backend, `VITE_HCAPTCHA_SITE_KEY` frontend). Falls back to test keys in development mode.

* **Implementation**: `captcha.js` middleware verifies tokens server-side before processing auth requests. `CaptchaWidget` component wraps the hCaptcha React widget with reset-on-error behavior.

---

## 🗄️ Data Models

### User
```
name, email, passwordHash, role (admin | organizer | participant),
participantType (iiit | non-iiit), isIIIT, instituteName, collegeOrgName, contactNumber,
interests[], followedOrganizers[], passwordResetRequests[{reason, status, ...}]
```

### Event
```
name, description, type (normal | merchandise), eligibility (iiit | non-iiit | both),
registrationDeadline, startDate, endDate, registrationLimit, registrationFee,
teamRegistration, maxTeamSize, saleStartDate, saleEndDate, tags[], stock,
purchaseLimit, merchandiseVariants[{name, price, stock, purchaseLimitPerUser}],
variants[{name, options[]}], customFormSchema[{label, type, required, options[]}],
status (draft | published | ongoing | sale-live | sale-ended | completed | closed),
organizerId, createdAt
```

### Registration
```
eventId, participantId, formResponses{}, paymentStatus, ticketId (UUID),
qrCodeUrl, attendedAt, teamId, createdAt
```

### Team
```
eventId, leaderId, name, inviteCode, requiredSize, members[{participantId, status}],
isComplete, createdAt
```

### ForumMessage
```
eventId, authorId, authorRole, content, parentMessageId, isPinned,
reactions[{emoji, count, userIds[]}], createdAt
```

---

## 🗂️ Project Structure

```
evently/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Business logic (auth, events, registration, teams, forum, admin, organizer)
│   │   │   ├── adminController.js
│   │   │   ├── authController.js
│   │   │   ├── eventController.js
│   │   │   ├── organizerController.js
│   │   │   ├── profileController.js
│   │   │   └── registrationController.js
│   │   ├── middleware/       # Auth, RBAC, captcha, event edit permissions, validation
│   │   │   ├── auth.js
│   │   │   ├── captcha.js
│   │   │   └── checkEventEditPermission.js
│   │   ├── models/           # Mongoose schemas (User, Event, Registration, Team, ForumMessage)
│   │   ├── routes/           # Express route definitions with Joi validation
│   │   └── utils/            # Email service, QR generation, socket.io, event status computation
│   │       ├── emailService.js
│   │       ├── qr.js
│   │       ├── socket.js
│   │       └── updateEventStatus.js
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI (Navbar, ProtectedRoute, DiscussionForum, TeamSection, etc.)
│   │   ├── context/          # AuthContext for global auth state
│   │   ├── pages/            # Route-level page components
│   │   └── api/              # Axios client with JWT interceptor
│   └── .env.example
├── deployment.txt
├── TESTING.md
└── README.md
```

---

## ⚙️ Local Setup

### Prerequisites

- Node.js 18+
- MongoDB URI (Atlas free tier or local instance)
- SMTP credentials (Gmail app password works)
- Discord webhook URL (optional — disables webhook feature if absent)
- hCaptcha site/secret key pair (optional — defaults to test keys in dev)

### 1. Clone the repository

```bash
git clone https://github.com/Bhanuprakash0807/evently.git
cd evently
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in all values in .env
npm install
npm run dev
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL to http://localhost:<PORT>/api
npm install
npm run dev
```

Both services are fully driven by environment variables — no localhost defaults are hardcoded.

---

## 🔐 Environment Variables

### `backend/.env`

```env
PORT=5000
MONGO_URI=                   # MongoDB Atlas connection string
JWT_SECRET=                  # Strong random secret for JWT signing
ADMIN_EMAIL=                 # Seeded admin account email
ADMIN_PASSWORD=              # Seeded admin account password
SMTP_HOST=                   # e.g. smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=                  # Sender email address
SMTP_PASSWORD=               # App password or SMTP password
SMTP_DISABLE=false
FRONTEND_URL=                # e.g. http://localhost:5173 or production URL
HCAPTCHA_SECRET_KEY=         # hCaptcha server-side secret key
NODE_ENV=production
```

### `frontend/.env`

```env
VITE_API_URL=                # Include /api suffix — e.g. http://localhost:5000/api
VITE_HCAPTCHA_SITE_KEY=      # hCaptcha client-side site key
```

---

## 📡 API Overview

All routes are prefixed with `/api`. Protected routes require a valid JWT cookie.

| Domain | Prefix | Auth |
|---|---|---|
| Authentication | `/api/auth` | Public (login/register) |
| Participants | `/api/participant` | Participant role |
| Events | `/api/events` | Mixed (browse public, manage protected) |
| Registrations | `/api/registrations` | Participant role |
| Teams | `/api/teams` | Participant role |
| Merchandise | `/api/merchandise` | Participant + Organizer |
| Forum | `/api/forum` | Registered participants + Organizer |
| Organizers | `/api/organizer` | Organizer role |
| Admin | `/api/admin` | Admin role only |

---

## 🌐 Deployment

| Layer | Platform | URL |
|---|---|---|
| **Frontend** | Vercel | [dassassignment1-frontend.vercel.app](https://dassassignment1-frontend.vercel.app) |
| **Backend API** | Render | [dassassignment1.onrender.com/api](https://dassassignment1.onrender.com/api) |
| **Database** | MongoDB Atlas | Connected via `MONGO_URI` environment variable |

> The backend is on Render's free tier. If the first request is slow, give it 30–60 seconds to wake up — subsequent requests are fast.

---

## 📋 Scripts

### Backend

```bash
npm run dev      # Development server with nodemon (hot reload)
npm start        # Production server
```

### Frontend

```bash
npm run dev      # Development server (Vite HMR)
npm run build    # Production build output
npm run preview  # Preview the production build locally
```

---

## 🧪 Testing

A full end-to-end test checklist covering all role flows is documented in [`TESTING.md`](./TESTING.md):

- Admin → create organizer → share credentials
- Organizer → create event → publish → Discord webhook fires
- Participant → register → receive QR ticket email
- Team leader → create team → invite → member accepts → all tickets generated
- Merchandise → order → upload proof → organizer approves → QR ticket sent
- QR Scanner → scan participant ticket → mark attendance → export CSV
- Discussion forum → post message → organizer pins → participant replies
- Password reset → organizer requests → admin approves → new credentials issued
- CAPTCHA validation on login and signup pages

<div align="center">

Built with ❤️ for Felicity — IIIT Hyderabad's Annual Fest

</div>
