# Omnigo Backend API

## 1️⃣ Project Overview
Omnigo Backend is a high-performance RESTful API and real-time event engine powering a multi-vendor food, grocery, and pharmacy delivery platform. It unifies order processing, dynamic commission calculation, geospatial location handling, and real-time status synchronization between customers, vendors, and admin portals.

---

## 2️⃣ Features
* **Multi-Vendor Management:** Role-based access control (RBAC) handling Admins, Restaurant Owners, and Home Chefs with customized status flows (`pending`, `approved`, `blocked`).
* **Dynamic Menu & Category Schema:** Support for multi-level category and subcategory hierarchies per merchant.
* **Real-time Synchronization:** Socket.io integration for instant order updates without manual polling.
* **Geospatial & Address Indexing:** Built-in MongoDB 2dsphere indexing readiness for geo-fenced merchant queries and live order tracking.
* **Automated Slug Generation:** Pre-save lifecycle hooks to ensure clean, human-readable API paths for merchant profiles.
* **Financial Ledgering:** Track vendor payouts, commission rates, delivery fees, and minimum order limits automatically.

---

## 3️⃣ Tech Stack
* **Node.js & Express.js:** Core runtime and web framework for REST API routing and middleware handling.
* **MongoDB & Mongoose:** NoSQL database with schema modeling, validation, and middleware pre-save hooks.
* **Socket.io:** WebSockets layer enabling duplex communication for live order tracking and status pushes.
* **JSON Web Tokens (JWT):** Stateless authentication mechanism for client-side authorization across sessions.

---

## 4️⃣ Architecture
┌─────────────────┐       ┌─────────────────┐
│   Omnigo App    │       │  Omnigo Admin   │
└────────┬────────┘       └────────┬────────┘
│ HTTP / WS               │ HTTP / WS
└────────────┬────────────┘
▼
┌───────────────────┐
│   Express API     │
│   & Socket Server │
└─────────┬─────────┘
│ Mongoose
▼
┌───────────────────┐
│ MongoDB Database  │
└───────────────────┘


---

## 5️⃣ Project Structure
```text
omnigo-backend/
├── config/             # Database connection & environment setups
├── controllers/        # Business logic for merchants, orders, & auth
├── middleware/         # JWT verification, RBAC, error handlers
├── models/             # Mongoose schemas (User, Restaurant, Order, etc.)
├── routes/             # REST API endpoint definitions
├── sockets/            # Socket.io connection handlers & event emitters
├── utils/              # Helper utilities and slug generators
├── server.js           # Server entrypoint
└── package.json
```

---

## 6️⃣ Installation & Setup
**Prerequisites**
Node.js >= 18.x

MongoDB instance (Local or MongoDB Atlas)

**Environment Variables**
Create a .env file in the root directory:

**Code snippet**
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/omnigo
JWT_SECRET=your_jwt_secret_key
SOCKET_ALLOWED_ORIGIN=*

**Commands**
**Bash**

# Install dependencies
npm install

# Run in development mode with live reload
npm run dev

# Start production server
npm start

---

## 7️⃣ Usage
Start the server; verify the console displays MongoDB Connected and Server running on port 5000.

Connect mobile or admin client apps pointing to http://localhost:5000/api.

Use WebSocket client listeners to subscribe to events like order_updated or vendor_status_changed.

--- 

## 8️⃣ Screenshots / Demo
**Live API Base URL**: https://api.omnigo.com/api/v1 (Replace with active production deployment link)

---

## 9️⃣ API Documentation
**Merchant Management**
**POST** /api/restaurants

**Auth**: Required (Bearer Token)

**Body**:

**JSON**
{
  "name": "Spice Route",
  "contact": { "phone": "+000000000000" },
  "address": { "street": "Main Blvd", "city": "Karachi" }
}
**Response** (201 Created): Returns created merchant payload with auto-generated slug.

**GET** /api/restaurants

**Query Params**: belongsTo=restaurant|homeChef, status=approved, category=Fast Food

**Response** (200 OK): Array of filtered merchant objects.

---

## 🔟 Engineering Decisions
Embed vs. Reference Schema Strategy: Address details and category structures are embedded directly within vendor profiles to eliminate unnecessary database $lookup joins, optimizing single-query read performance.

Pre-Save Lifecycle Hooks: Automatic slugification of merchant names is performed at the database abstraction layer, guaranteeing URL consistency across administrative and user inputs.

---

## 1️⃣1️⃣ Testing
**Tools**: Postman / Supertest + Jest.

**Run Command**:

**Bash**
npm run test

---

## 1️⃣2️⃣ Limitations & Future Improvements
**Current Limitation**: Geospatial queries currently fall back to static city text matching until client GPS coordinate pipelines are deployed.

**Planned Improvements**: Redis caching layer for merchant catalog views to reduce MongoDB read load.
