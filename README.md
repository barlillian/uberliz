# 🍔 Uber Eats Integration MVP

This project is a **Minimal Viable Product (MVP)** demonstrating an **full stack Uber Eats Marketplace API integration**.  
It was built for an **Uber technical interview project** to showcase full-stack OAuth integration, real-time POS activation flow, and webhook event handling.

---

## 🚀 What This Project Demonstrates
- End-to-end **OAuth2 Authorization Flow** (Authorization Code + Client Credentials)
- **Secure token handling** and **webhook signature verification**
- **Integration Activation** using Uber’s `POST /pos_data` API
- **Real-time store activation dashboard** powered by Socket.IO
- Full understanding of **Uber’s Marketplace API** and integration lifecycle

---

## 🔗 Resources
- 🧭 [Lucidchart: Integration Workflow Diagram](https://lucid.app/lucidchart/9ba4efa2-d7ea-4072-a5b6-03264c81cbe2/edit?invitationId=inv_ffb6cfa4-ab55-4434-b9c7-dffcf0a19bcb&page=0_0#)
- 🎥 [Demo Recording (YouTube)](https://www.youtube.com/watch?v=OcUnDGxT8rY)
- 🚀 [App Website (Render)](https://uberliz.onrender.com/)

---

## ⚙️ Core Features

### 1️⃣ OAuth Authorization Flow
- Merchant connects their Uber Eats account → app exchanges `authorization_code` for an access token  
- Access tokens are stored **in-memory** and refreshed automatically when expired  
- Supports both **Authorization Code Flow** and **Client Credentials Flow**

### 2️⃣ Retrieve Merchant Stores
- After authentication, app retrieves all stores associated with the merchant  
- Displays stores and activation status in the UI  

### 3️⃣ Activate Store Integration
- Merchant clicks **“Link App to Store”** → app calls Uber’s `POST /pos_data`  
- Store enters a “Pending” state until webhook confirmation is received  

### 4️⃣ Webhook Handling
- Handles `store.provisioned` and `store.deprovisioned` webhook events  
- Verifies Uber’s **HMAC signature (`x-uber-signature`)** for security  
- Updates activation status in real-time via **Socket.IO**

### 5️⃣ Real-Time Dashboard
- **Stores Section:** Displays all merchant stores with live activation status  
- **Webhook Events Section:** Live-updating log of last 50 webhook payloads with expandable details  

---

## 🧠 Design Notes
- **In-memory storage** used for simplicity (no DB required), tokens & events reset on server restart  
- **Real-time updates** via Socket.IO broadcasts  
- **Webhook testing** performed on Render (Uber only allows one webhook URL per app)  
- **Edge case handling:**  
  - `store.provisioned` confirmed via `GET /pos_data`  
  - `store.deprovisioned` handled directly as final state  

---

## 👩‍💻 Author
- **Liz Chen** 
- **📅 September 2025** 
- **🧩 Built for Uber Interview Project – Marketplace API Integration Demo** 

---

## 🛠️ Tech Stack
| Layer | Technology |
|-------|-------------|
| Backend | Node.js (Express) |
| Frontend | HTML, CSS, JavaScript |
| Real-time | Socket.IO |
| Auth | OAuth2 (Authorization Code + Client Credentials) |
| APIs | Uber Eats Marketplace API |

---

## 📁 Project Structure
```plaintext
uberLIZ/
├─ backend/
│  ├─ server.js          # Entry point: Express setup, routes, OAuth redirect, webhook endpoint
│  ├─ oauth.js           # Handles OAuth flow & token exchange
│  ├─ api.js             # Uber API wrapper (GET stores, POST activation)
│  ├─ webhook.js         # Webhook verification & event handling
│  ├─ config.js          # Environment variables & constants
│  └─ storage.js         # In-memory storage for tokens, states, and events
├─ frontend/
│  ├─ index.html         # Minimal UI for store display & linking
│  ├─ script.js          # Frontend logic, API calls, real-time updates
│  └─ style.css          # Basic styling
├─ .env                  # Client ID, secret, redirect URI (excluded via .gitignore)
├─ .gitignore            # Excludes node_modules, .env, logs, etc.
├─ package.json          # Dependencies and scripts
└─ README.md             # Project documentation