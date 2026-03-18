# BloodLink — Blood Bank Management System

> B.Tech Design Thinking Project

A modern, production-grade Blood Bank Management System built with HTML, CSS, JavaScript, and Firebase.

## Features

- **Landing Page** — Project intro, problem/solution, features, CTA
- **Authentication** — Firebase Auth with role-based access (Admin/Staff/Hospital)
- **Dashboard** — Stats overview, urgent requests, low stock alerts, blood group inventory
- **Donor Management** — Searchable donor table, add/delete donors, blood group filtering
- **Inventory Tracking** — Blood stock levels, expiry tracking, batch management
- **Blood Requests** — Hospital request management with status flow (Pending → Approved → Matched → Completed)
- **Donation Camps** — Camp planning, registration tracking, progress visualization
- **Audit Logs** — Every action is logged for accountability

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend/DB:** Firebase Firestore (NoSQL)
- **Auth:** Firebase Authentication
- **Design:** Custom CSS design system (DM Sans + Instrument Serif)
- **Icons:** Hand-crafted SVG icons (Lucide-inspired)

## Setup Instructions

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (e.g., "bloodlink-bbms")
3. Enable **Authentication** → Email/Password provider
4. Enable **Cloud Firestore** → Start in test mode

### 2. Get Firebase Config
1. Project Settings → General → Your apps → Add Web App
2. Copy the config object

### 3. Update Config
Edit `js/firebase-config.js` and replace the placeholder values:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 4. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 5. Run the Project
Simply open `index.html` in a browser, or use a local server:
```bash
# Python
python -m http.server 8000

# Node.js
npx serve .
```

### 6. Load Demo Data
Go to the Dashboard and click "Load Demo Data" to populate sample data.

## File Structure

```
bloodbank/
├── index.html          # Landing page
├── login.html          # Authentication page
├── dashboard.html      # Admin dashboard
├── donors.html         # Donor management
├── inventory.html      # Blood inventory
├── requests.html       # Blood requests
├── camps.html          # Donation camps
├── css/
│   └── style.css       # Complete design system
├── js/
│   ├── firebase-config.js  # Firebase initialization
│   ├── db.js               # Database helper functions
│   ├── auth.js             # Authentication module
│   └── ui.js               # Shared UI components & icons
├── firestore.rules     # Security rules
├── .env.example        # Environment template
└── README.md
```

## Firestore Schema

| Collection | Key Fields |
|-----------|-----------|
| users | name, email, role, active, createdAt |
| donors | name, bloodGroup, phone, email, age, gender, city, lastDonation, available |
| inventoryBatches | bloodGroup, units, source, collectedDate, expiryDate, status |
| bloodRequests | hospitalName, bloodGroup, unitsNeeded, urgency, status, patientName, contactPerson |
| donationCamps | name, organizer, location, date, expectedDonors, registeredDonors, status |
| notifications | type, message, read, createdAt |
| auditLogs | action, details, userId, userEmail, timestamp |

## License

Academic project — built for B.Tech Design Thinking coursework.
