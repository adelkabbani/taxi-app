# Taxi Booking & Dispatch System - Master Guide

This document is the **single source of truth** for the Taxi Dispatch project. It consolidates all essential information, setup instructions, and architecture details.

## 1. Project Overview
This is a **production-grade taxi booking and dispatch system**.
- **Backend**: Node.js, Express, PostgreSQL, Redis, Socket.io
- **Frontend**: React (Vite), Admin Dashboard
- **Capabilities**: Real-time tracking, driver management, evidentiary support for disputes, multi-tenant architecture.

## 2. Current Status
**Backend (Invisible Engine):** ✅ **Mostly Complete**
- Database, API endpoints, Authentication, and Business Logic are working.
- **Evidence Vault**: Securely stores photos + GPS for no-show disputes.
- **State Machine**: Enforces rules (e.g., "Driver cannot start trip before arriving").

**Frontend (Visible UI):** 🚧 **Work In Progress**
- **Working**: Login, Dashboard, Basic Lists (Drivers, Bookings).
- **Missing**: Document verification pages, detailed analytics charts, some driver detail views.

## 3. How to Run the Project
To use the system, you must start **both** the backend and the frontend.

### Option A: The Easy Way (Windows)
1.  Look for the file `START-BACKEND.bat` in the root folder.
2.  **Double-click it**.
3.  A terminal window will open showing "Server running on port 3001". **Keep this open.**
4.  Open your browser to `http://localhost:5173` to view the frontend.

### Option B: The Manual Way
**Terminal 1 (Backend):**
```bash
cd backend
npm start
```
*Wait for "Server running on port 3001"*

**Terminal 2 (Frontend):**
```bash
cd admin-web
npm run dev
```

## 4. Login Credentials
- **URL**: `http://localhost:5173/login`
- **Email**: `admin@taxi.com`
- **Password**: `admin123`

## 5. Troubleshooting Common Issues
**"Login Failed" or "Network Error"**
- **Cause**: The backend server is not running.
- **Fix**: Make sure the backend terminal is open and says "Server running on port 3001".
- **Check**: Open `http://localhost:3001` in your browser. It should say "Taxi Dispatch API is Running 🟢".

**"Database connection failed"**
- **Cause**: PostgreSQL is not running or password is wrong.
- **Fix**: Check `backend/.env` file. Ensure `DB_PASSWORD` matches your local PostgreSQL password.

## 6. System Architecture & Features

### The Backend Engine
| Feature | Status | Description |
|:---|:---|:---|
| **Auth** | ✅ Ready | Secure Login, Registration, JWT Tokens |
| **Bookings** | ✅ Ready | Create, Assign, Cancel, Complete, Timeline |
| **Drivers** | ✅ Ready | Track Location, Go Online/Offline, Shifts |
| **Evidence** | ✅ Ready | Upload Photo, Validate GPS, Anti-tamper Hash |

### Key Components
- **Database (PostgreSQL)**: Single source of truth. 25 tables.
- **Real-time (Socket.io)**: Blasts driver locations to the dashboard.
- **Geo-Fence**: "Arrived" button only works if driver is < 150m from pickup.

---
*End of Guide*
