# AnjaliNet — Broadband Billing Management System

A full-stack web application for Anjali Communications to manage broadband customer billing, payments, and reports.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, Tailwind CSS, React Icons, Recharts |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose ORM) |
| Auth | JWT + bcryptjs |

---

## Project Structure

```
anjali-net/
├── backend/          # Express API server
│   ├── models/       # Mongoose models (User, Customer, Billing, Plan)
│   ├── routes/       # API routes
│   ├── middleware/   # Auth middleware
│   ├── server.js     # Entry point
│   └── .env.example  # Environment variables template
│
├── frontend/         # React + Vite app
│   ├── src/
│   │   ├── pages/        # Dashboard, Customers, Billing, Reports, Plans, Users, Settings
│   │   ├── components/   # Layout (Sidebar, Header) + UI (Modal, Toast, Forms)
│   │   ├── context/      # AuthContext
│   │   └── utils/        # API client, helpers
│   └── tailwind.config.js
│
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js 18+ installed
- MongoDB running locally **OR** a MongoDB Atlas connection string

---

### Step 1 — Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and a strong JWT_SECRET
npm install
npm run dev
```

Backend runs at: `http://localhost:5000`

**`.env` file:**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/anjali_net
JWT_SECRET=change_this_to_a_strong_random_secret
JWT_EXPIRE=24h
NODE_ENV=development
```

---

### Step 2 — Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

### Step 3 — First-Time Setup (Create Admin Account)

1. Open `http://localhost:5173/login` in your browser
2. Click **"Initialize Admin Account"** button
3. This creates the default admin: `admin@anjalicomm.in` / `admin123`
4. Log in and **immediately change your password** in Settings

---

### Step 4 — Load Default Plans (Optional)

1. Log in as admin
2. Go to **Plans** page
3. Click **"Load Defaults"** to populate 9 standard broadband plans

---

## Features

### ✅ Implemented
- **Login system** with JWT auth (Admin / Agent / Viewer roles)
- **Dashboard** with KPI cards, revenue trend chart, payment breakdown, unpaid list
- **Customer Management** — add, edit, search, filter, paginate customers
- **Customer Profile** — full billing history, quick stats, record payment
- **Billing Sheet** — monthly billing records with color-coded status rows
- **Mark as Paid** — one-click payment marking
- **Reports** — monthly collection, payment breakdown charts, unpaid list
- **Plans Management** — add/edit/deactivate broadband plans
- **Users Management** — create agents and viewers (admin only)
- **Settings** — change password, account info
- **Mobile Responsive** — collapsible sidebar, responsive tables
- **Global Search** — search customers from the header bar

### 🔜 Future Enhancements
- Excel import/export (SheetJS integration)
- PDF bill/receipt printing
- WhatsApp payment reminders
- Audit log viewer
- SMS alerts

---

## API Endpoints

### Auth
```
POST   /api/auth/login           Login
GET    /api/auth/me              Get current user
PUT    /api/auth/change-password Change password
POST   /api/auth/seed            Create first admin (only if no users)
```

### Customers
```
GET    /api/customers            List (paginated, filterable)
POST   /api/customers            Create
GET    /api/customers/:id        Get single
PUT    /api/customers/:id        Update
DELETE /api/customers/:id        Soft delete
GET    /api/customers/:id/billing Billing history + stats
GET    /api/customers/search?q=  Autocomplete search
```

### Billing
```
GET    /api/billing              List (filter by month, status, type)
POST   /api/billing              Create record
PUT    /api/billing/:id          Update
DELETE /api/billing/:id          Delete (admin only)
POST   /api/billing/:id/pay      Quick mark paid
GET    /api/billing/months       List all months with data
```

### Dashboard
```
GET    /api/dashboard/summary       KPI summary
GET    /api/dashboard/monthly-trend 12-month trend
GET    /api/dashboard/payment-breakdown Payment method breakdown
GET    /api/dashboard/unpaid        Unpaid customers list
```

### Plans & Users
```
GET/POST/PUT/DELETE /api/plans
GET/POST/PUT/DELETE /api/users  (admin only)
```

---

## Default Color Scheme

| Color | Hex | Usage |
|-------|-----|-------|
| Brand Blue | `#1A3C6E` | Sidebar, primary buttons |
| Accent Cyan | `#00B4D8` | Links, active states |
| Green | `#22C55E` | Paid status |
| Amber | `#F59E0B` | Partial payment |
| Red | `#EF4444` | Unpaid / danger |

---

## Deployment

### Backend (Railway / Render / VPS)
1. Set environment variables (MONGODB_URI, JWT_SECRET, NODE_ENV=production)
2. `npm start`

### Frontend (Vercel / Netlify)
1. Set `VITE_API_URL` if backend is on a different domain
2. Update `vite.config.js` proxy target to your backend URL
3. `npm run build` → deploy `dist/` folder

---

## Support

Built for Anjali Communications, Kozhikode, Kerala.  
AnjaliNet v1.0.0 — April 2026
