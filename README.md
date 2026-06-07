# Evently

> Full-stack MERN event management platform with role-based access, stateless JWT auth, and a complete organizer toolkit — built for Felicity.

![Node](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Roles

| Role | Capabilities |
|---|---|
| **Admin** | Seed account, manage organizers, platform-wide oversight |
| **Organizer** | Create/publish/close events, custom forms, CSV export, Discord notifications |
| **Participant** | Browse, register, receive QR ticket emails, dashboard tabs |

---

## Tech Stack

| Tech | Why |
|---|---|
| Express | Minimal HTTP framework with clean middleware and route organization |
| MongoDB | Flexible document store for events, dynamic forms, and registrations |
| JWT + httpOnly cookies | Stateless auth compatible with SPA + API, XSS-resistant |
| bcrypt | Secure password hashing with configurable salt rounds |
| Nodemailer | SMTP transport for ticket and password reset emails |
| Fuse.js | Client-side fuzzy search powering browse, filters, and trending |
| Joi | Declarative input validation across all role flows |
| qrcode | QR images embedded in ticket emails for entry scanning |
| json2csv | Fast CSV export for participant lists |

---

## Features

### Tier A
- Organizer dashboard with event stats
- Event lifecycle enforcement — draft → publish → close
- Custom form builder per event

### Tier B
- Participants table with CSV export
- Discord webhook notification on event publish
- Browse page with fuzzy search, filters, and trending

### Tier C
- Forced password change on first organizer login
- Strict IIIT email validation
- Ticket emails with UUID + QR code
- Recommendations ordering and participant dashboard tabs

---

## Project Structure

```
evently/
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   └── utils/
    └── .env.example
```

---

## Setup

### Prerequisites
- Node.js 18+
- MongoDB URI (Atlas or local)
- SMTP credentials
- Discord webhook URL

### Backend
```bash
cd backend
cp .env.example .env      # fill in your values
npm install
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env      # set VITE_API_URL
npm install
npm run dev
```

> Both services rely on env URLs — no localhost defaults are baked into the code.

---

## Environment Variables

**Backend — `backend/.env`**
```
PORT=
MONGO_URI=
JWT_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD=
SMTP_EMAIL=
SMTP_PASSWORD=
SMTP_HOST=
SMTP_PORT=
FRONTEND_URL=
```

**Frontend — `frontend/.env`**
```
VITE_API_URL=        # include /api suffix
```

---

## Scripts

**Backend**
```bash
npm run dev      # development with nodemon
npm start        # production
```

**Frontend**
```bash
npm run dev      # development server
npm run build    # production build
npm run preview  # preview production build
```

---

## Testing

Full end-to-end checklist (admin → organizer → participant flows, publish webhook, CSV export, ticket email with QR/UUID, password reset) is documented in [`TESTING.md`](./TESTING.md).

---

## Deployment

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | https://dassassignment1-frontend.vercel.app |
| Backend API | Render | https://dassassignment1.onrender.com/api |

> The backend is hosted on Render's free tier — it may take 30–60 seconds to wake up on the first request.
