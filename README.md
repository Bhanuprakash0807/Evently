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
- [Advanced Features](#-advanced-features)
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
| **JWT + httpOnly Cookies** | Stateless auth with XSS-resistant httpOnly cookie transport |
| **Role-Based Access Control** | Every frontend route and backend endpoint is protected by role middleware |
| **Session Persistence** | Sessions survive browser restarts; logout explicitly clears all tokens |
| **Bot Protection** | CAPTCHA verification on login and registration pages via Google reCAPTCHA / hCaptcha |

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
| **QR Scanner & Attendance** | Built-in camera scanner or file upload; marks attendance with timestamp; rejects duplicate scans; live dashboard; CSV export; manual override with audit log |
| **Discord Webhook** | Auto-posts new event announcements to a configured Discord channel on publish |
| **Password Reset Workflow** | Request reset via Admin; Admin approves/rejects with comments; system auto-generates new password |
| **Organizer Profile** | Editable name, category, description, contact; configure Discord webhook URL |

---

### 🛡️ Admin Features

| Feature | Details |
|---|---|
| **Organizer Management** | Create organizer accounts with auto-generated credentials; view all clubs; disable or permanently delete accounts |
| **Password Reset Requests** | View all pending requests with club name, date, reason; approve or reject with comments; system notifies on approval |

---

## 🛠️ Tech Stack & Justifications

### Backend

| Library / Tool | Purpose | Why This Choice |
|---|---|---|
| **Node.js 18+** | Runtime | Non-blocking I/O ideal for concurrent event registrations and real-time features |
| **Express.js** | HTTP framework | Minimal surface area with clean middleware chaining; easy to layer auth, validation, and error handling |
| **MongoDB + Mongoose** | Database & ODM | Flexible document schema accommodates dynamic custom forms and varied event types without rigid migrations |
| **JWT** | Authentication tokens | Stateless tokens eliminate server-side session storage; scales well with a deployed SPA + API architecture |
| **bcrypt** | Password hashing | Industry-standard adaptive hashing with configurable salt rounds; resistant to brute-force attacks |
| **Nodemailer** | Email delivery | Flexible SMTP transport for sending QR ticket emails, password reset notifications, and confirmations |
| **qrcode** | QR code generation | Generates QR images embedded directly in ticket emails; used by organizer scanner for entry validation |
| **Socket.io** | Real-time communication | Powers the live discussion forum with instant message delivery, typing indicators, and online status |
| **Joi** | Input validation | Declarative schema validation across all role flows — cleaner than manual checks and easier to maintain |
| **json2csv** | CSV export | Fast, dependency-light conversion of participant arrays to downloadable CSV for organizer export |
| **Multer** | File upload handling | Handles payment proof image uploads for merchandise approval workflow |
| **Fuse.js** | Fuzzy search | Lightweight client-side fuzzy matching for browse page search without full-text index overhead |
| **ics** | Calendar file generation | Generates standards-compliant `.ics` files for universal calendar import (Google, Outlook, Apple) |

### Frontend

| Library / Tool | Purpose | Why This Choice |
|---|---|---|
| **React + Vite** | UI framework + build tool | Fast HMR, lean build output, and component model fits complex role-based page trees |
| **React Router v6** | Client-side routing | Declarative nested routes with loader/action pattern; easy role-based route guards |
| **Tailwind CSS** | Utility-first styling | Rapid UI development without context-switching to CSS files; consistent design tokens |
| **Axios** | HTTP client | Interceptor support for attaching JWT headers and handling 401 redirects globally |
| **React Hook Form** | Form state management | Minimal re-renders for dynamic custom event registration forms; integrates with Joi validation |
| **html5-qrcode** | QR scanner (camera) | Browser-native camera access for organizer attendance scanning without native app dependency |
| **Socket.io-client** | Real-time client | Pairs with server Socket.io for the discussion forum and team chat |
| **date-fns** | Date utilities | Lightweight, tree-shakeable date formatting and comparison for event deadlines and schedules |
| **React Hot Toast** | Notifications | Non-intrusive toast notifications for registration confirmations, errors, and real-time forum alerts |

---

## 🚀 Advanced Features

### Tier A — Core Advanced Features (16 marks)

#### 1. Hackathon Team Registration

Team-based event registration with a complete invite and formation workflow:

- Team leader creates a team and sets the required size
- Members are invited via a **unique shareable code or link**
- Registration status is tracked per member: Pending / Accepted / Rejected
- A team's registration is only **marked complete when all invited members accept**
- **Team management dashboard** for the leader — view invite status, remove members, disband team
- **Automatic ticket generation** for all members simultaneously on team completion, each with a unique QR code
- Integrates with the participant dashboard — teams appear as a single record with team name and member list

#### 2. Merchandise Payment Approval Workflow

A manual payment verification loop between participant and organizer:

- Participant selects item variant → places order → **uploads payment proof image**
- Order enters **Pending Approval** state; no QR is generated at this stage
- Organizer sees a dedicated **Payment Approvals tab** with order list, uploaded proof thumbnails, and current status
- Organizer can **Approve** or **Reject** with optional comments
- On approval: stock is decremented, order marked Successful, **QR ticket is generated**, confirmation email sent
- On rejection: participant is notified via email with reason; can re-upload if allowed
- Prevents stock overselling — stock only decrements on approval, not on order placement

---

### Tier B — Real-time & Communication Features (12 marks)

#### 1. Real-Time Discussion Forum

Per-event discussion space available to all registered participants:

- Built with **Socket.io** for instant message delivery without polling
- Participants can post messages, reply in **threads**, and react with emojis
- Organizers can **pin announcements**, delete inappropriate messages, and respond to queries
- **Notification badges** on the forum tab when new messages arrive while viewing other sections
- Message history is persisted in MongoDB and loaded on page entry

#### 2. Organizer Password Reset Workflow

A structured, admin-mediated reset process (organizers cannot self-reset):

- Organizer submits a **password reset request** with reason from their profile
- Admin sees all requests with club name, submission date, reason, and current status (Pending / Approved / Rejected)
- Admin can **approve or reject** with optional comments
- On approval: system **auto-generates a new secure password**, Admin receives it and shares it with the organizer
- Full **request history** visible to both Admin and Organizer
- Organizer is prompted to change the auto-generated password on next login

---

### Tier C — Integration & Enhancement Features (2 marks)

#### Bot Protection

CAPTCHA verification on all public-facing auth pages:

- Integrated **hCaptcha** on login and registration forms
- Server-side token verification before processing any auth request
- Prevents automated account creation, credential stuffing, and bot registrations

---

## 📦 Data Models

### Participant
```
firstName, lastName, email (unique), passwordHash, participantType (IIIT | NonIIIT),
college, contactNumber, interests[], followedOrganizers[], createdAt
```

### Organizer
```
name, category, description, contactEmail, loginEmail, passwordHash,
discordWebhookUrl, isActive, createdAt
```

### Event
```
name, description, type (Normal | Merchandise), eligibility, registrationDeadline,
startDate, endDate, registrationLimit, registrationFee, tags[], status,
organizerId, customFormSchema[], createdAt
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

### MerchandiseOrder
```
eventId, participantId, variant{size, color}, paymentProofUrl,
approvalStatus (Pending | Approved | Rejected), organizerComment,
ticketId, qrCodeUrl, createdAt
```

### ForumMessage
```
eventId, authorId, authorRole, content, parentMessageId, isPinned,
reactions[{emoji, count, userIds[]}], createdAt
```

### PasswordResetRequest
```
organizerId, reason, status (Pending | Approved | Rejected),
adminComment, resolvedAt, createdAt
```

---

## 🗂️ Project Structure

```
evently/
├── backend/
│   ├── controllers/          # Route handler logic per domain
│   │   ├── auth.controller.js
│   │   ├── event.controller.js
│   │   ├── team.controller.js
│   │   ├── merchandise.controller.js
│   │   ├── forum.controller.js
│   │   └── admin.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js     # JWT verification
│   │   └── role.middleware.js     # Role-based guards
│   ├── models/               # Mongoose schemas
│   ├── routes/               # Express routers
│   ├── sockets/              # Socket.io event handlers
│   ├── utils/
│   │   ├── email.js          # Nodemailer templates
│   │   ├── qr.js             # QR generation
│   │   └── csv.js            # CSV export
│   ├── .env.example
│   └── server.js
└── frontend/
    ├── src/
    │   ├── components/       # Shared UI components
    │   ├── pages/
    │   │   ├── participant/  # Dashboard, Browse, Profile, Forum
    │   │   ├── organizer/    # Dashboard, Create Event, Scanner
    │   │   └── admin/        # Manage Clubs, Password Requests
    │   ├── hooks/            # Custom React hooks
    │   ├── context/          # Auth context and socket provider
    │   └── utils/            # Axios instance, helpers
    ├── .env.example
    └── index.html
```

---

## ⚙️ Local Setup

### Prerequisites

- Node.js 18+
- MongoDB URI (Atlas free tier or local instance)
- SMTP credentials (Gmail app password works)
- Discord webhook URL (optional — disables webhook feature if absent)
- hCaptcha site/secret key pair

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
FRONTEND_URL=                # e.g. http://localhost:5173 or production URL
RECAPTCHA_SECRET_KEY=        # Google reCAPTCHA server-side secret
```

### `frontend/.env`

```env
VITE_API_URL=                # Include /api suffix — e.g. http://localhost:5000/api
VITE_RECAPTCHA_SITE_KEY=     # Google reCAPTCHA client-side site key
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
