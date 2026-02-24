# Event Platform (MERN)

Centralized Felicity event platform with role-based access for Admin, Organizer, and Participant. Auth uses JWT with httpOnly cookies, bcrypt hashing, and enforced role guards.

## Tech Stack (Why)
- Express: battle-tested minimal HTTP framework with middleware support and clear route organization.
- MongoDB: flexible document store for events, dynamic custom forms, and registrations.
- JWT: stateless auth tokens compatible with SPA + API and httpOnly cookies.
- bcrypt: secure password hashing with configurable salt rounds.
- Nodemailer: SMTP transport for ticket and password emails.
- Fuse.js: client-side fuzzy search powering browse/search/trending responsiveness.
- json2csv: fast CSV export for participant lists.
- Joi: declarative input validation for admin/organizer/registration flows.
- qrcode: generates QR images embedded in ticket emails for entry scanning.

## Advanced Features Implemented
- Tiered picks: Organizer dashboard stats (Tier A), event lifecycle enforcement with publish/close (Tier A), custom form builder per event (Tier A), participants table with CSV export (Tier B), Discord webhook on publish (Tier B), browse with search/filters/trending (Tier B), forced password change on first login (Tier C), strict IIIT email validation (Tier C), ticket emails with UUID + QR (Tier C), recommendations ordering and participant dashboard tabs (Tier C).

## Setup
1) Prerequisites: Node.js 18+, MongoDB URI, SMTP credentials, Discord webhook URL for publish notifications.
2) Backend
  - Copy backend/.env.example → backend/.env and fill values (Mongo, JWT, admin seed, SMTP, FRONTEND_URL).
  - From backend/: `npm install` then `npm run dev` (or `npm start`).
3) Frontend
  - Copy frontend/.env.example → frontend/.env and set `VITE_API_URL` to the deployed backend API (include `/api`).
  - From frontend/: `npm install` then `npm run dev` (or `npm run build && npm run preview`).
4) Running locally: start backend, then frontend; both rely on env URLs (no localhost defaults baked into code).

## Environment Variables
- Backend: `PORT`, `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SMTP_EMAIL`, `SMTP_PASSWORD`, `SMTP_HOST`, `SMTP_PORT`, `FRONTEND_URL`.
- Frontend: `VITE_API_URL`.

## Testing
- Follow the end-to-end checklist in TESTING.md (admin→organizer→participant flows, publish webhook, CSV export, ticket email with QR/UUID, password reset).

## Scripts
- Backend: `npm run dev`, `npm start`.
- Frontend: `npm run dev`, `npm run build`, `npm run preview`.
