Omnigo Backend

Omnigo Backend is the central API and real-time service layer for the
Omnigo food and delivery platform. It manages authentication, users,
restaurants, home chefs, products, orders, riders, deals, reviews,
wallets, chat, notifications, and administrative workflows.

The backend provides a single API layer consumed by the Omnigo customer
application and Omnigo Admin, with MongoDB as the primary database and
Socket.IO/Firebase services for real-time and notification-related
functionality.

1. Features

Authentication & Users: signup/login, roles, verification,
profiles, addresses, wallets and user status.

Restaurants & Home Chefs: profiles, categories/subcategories,
opening hours, delivery times, fees, ratings, documents and
approval/status workflows.

Products & Menus: images, descriptions, pricing/discounts,
add-ons, vegetarian flag, tags/icons, availability, preparation
time, ratings, likes/favourites and product types.

Orders: order creation/history, status management, previously
ordered items and delivery workflow.

Riders: rider profiles, vehicle information, verification,
online/offline state, GeoJSON location tracking, ratings and
auto-accept orders.

Real-Time: Socket.IO rooms/events for order status and
customer/rider chat.

Deals & Discovery: daily deals, featured deals, fast-delivery
discovery and popular/featured content.

Reviews: 1--5 ratings, review types, messages and review images.

Notifications & Media: Firebase Admin/FCM and Cloudinary
integration.

2. Tech Stack

Technology           Role

Node.js              Backend runtime
Express.js           REST API framework
MongoDB              Primary database
Mongoose             MongoDB ODM/schema layer
Socket.IO            Real-time order/chat events
Firebase Admin SDK   FCM/server-side Firebase integration
Cloudinary           Images/documents/media
bcrypt               Password hashing
express-validator    Request validation
Postman              API testing
Railway              Temporary/cloud deployment

3. Architecture

flowchart TD
    APP["Omnigo Customer App"] --> API["Express REST API"]
    ADMIN["Omnigo Admin"] --> API
    API --> AUTH["Authentication / Authorization"]
    API --> USERS["Users / Roles"]
    API --> REST["Restaurants"]
    API --> CHEF["Home Chefs"]
    API --> PROD["Products / Menus"]
    API --> ORD["Orders"]
    API --> RIDER["Rider System"]
    API --> DEAL["Deals"]
    API --> REVIEW["Reviews"]
    API --> DB[("MongoDB")]
    API <--> SOCKET["Socket.IO"]
    SOCKET <--> APP
    SOCKET <--> RIDERAPP["Rider / Delivery Client"]
    API --> FIREBASE["Firebase / FCM"]
    API --> CLOUD["Cloudinary"]

4. Project Structure

Omnigo-App-Backend/
├── config/                 # Firebase and other configuration
├── controllers/            # Request/business logic
├── middleware/             # Auth, roles, validation and request middleware
├── models/                 # Mongoose schemas
├── routes/                 # Express API routes
├── services/               # Reusable business/service logic
├── sockets/                # Socket.IO setup/events where present
├── utils/                  # Shared helpers/response utilities
├── uploads/                # Local upload handling where applicable
├── .env                    # Local secrets; never commit
├── .gitignore
├── server.js               # Application entry point
└── package.json

Important models include User, Restaurant, HomeChef, Product,
Order, Deal and RestaurantReview.

5. Installation & Setup

Prerequisites

Node.js 18+ recommended

npm

MongoDB Atlas or local MongoDB

Firebase project/service account

Cloudinary account when media upload is enabled

Git

Postman

git clone <repository-url>
cd Omnigo-App-Backend
npm install

Create .env with the variables required by the current branch:

PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=your_certificate_url

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

Run:

npm run dev

or:

npm start

Default local API:

http://localhost:5000

Temporary deployed backend currently used during development:

https://omnigo-app-backend-production.up.railway.app

6. Usage

Customer/Admin
      ↓
REST API / Socket.IO
      ↓
Authentication + Business Logic
      ↓
MongoDB
      ↓
Restaurant/Home Chef → Preparation → Rider → Customer

Typical customer flow:

Signup/Login → Browse → Menu → Product/Add-ons → Cart → Checkout
→ Create Order → Preparation → Rider → Delivery → Review/Reorder

Typical rider flow:

Login → Verification → Go Online → Receive/Accept Order
→ Restaurant/Home Chef → Collect → Deliver → Complete

7. API Documentation

The exact route prefixes can vary by branch; verify the current
routes/ directory before integration.

Representative resources:

POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/users

GET  /api/restaurants
GET  /api/restaurants/:id
GET  /api/restaurants/:id/categories
GET  /api/restaurants/fast-delivery

GET/POST/PUT/DELETE /api/products/*
POST/GET/PUT        /api/orders/*
GET/POST/PUT        /api/deals/*
GET/POST            /api/reviews/*

Order statuses used by the project include:

pending
confirmed
preparing
ongoing
delivered
cancelled

Some flows also use completed.

Socket.IO events include:

join
join_admin
orderStatusUpdated
messageSent
receiveMessage

Protected endpoints use the authentication mechanism configured by the
backend.

8. Engineering Decisions

MongoDB + Mongoose: suitable for nested restaurant, menu,
address, add-on and order documents.

GeoJSON + 2dsphere: supports nearest-rider/proximity queries.

REST + Socket.IO: REST handles persistent operations; Socket.IO
handles immediate order/chat events.

Firebase Admin/FCM: provides push-notification infrastructure.

Cloudinary: keeps dynamic media outside MongoDB.

Role-based authorization: protects administrative and
operational endpoints.

9. Testing

Postman is used to test authentication, restaurants, home chefs,
products, orders, order statuses, riders, deals, reviews, fast delivery
and previously ordered items.

Socket.IO testing covers connection, room joining, order status events
and chat events.

Run the application and test the production URL after deployment.
Automated unit/integration coverage should be expanded.

10. Limitations & Future Improvements

Increase automated unit/integration coverage.

Add Swagger/OpenAPI documentation.

Centralize error handling and structured logging.

Add rate limiting and stronger permission policies.

Improve order transaction/idempotency handling.

Add CI/CD and production monitoring.

Consider Redis for scalable caching/realtime workloads.

Improve validation consistency.

Separate privileged onboarding flows more strictly.

Security

Never commit .env, serviceAccountKey.json, Firebase private keys,
JWT secrets, Cloudinary secrets, MongoDB credentials or email passwords.
Use environment variables/secret management.
