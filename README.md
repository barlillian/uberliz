# Uber Eats Integration MVP

This is a **minimal viable product (MVP)** demonstrating the Uber Eats Integration Activation flow, designed for interview purposes. The project implements a working backend and frontend that allows a merchant to connect with Uber Eats, retrieve stores, activate a store integration, and handle webhook events in real-time.

---

## Features / MVP Scope

### 1️⃣ OAuth Authorization
- **Button:** "Connect with Uber Eats" on the frontend.
- **Flow:** Follows the **Authorization Code Flow**:
  1. Merchant clicks the button → redirected to Uber OAuth.
  2. Merchant logs in → Uber redirects back to `/oauth/redirect` with `authorization_code`.
  3. App exchanges code → retrieves **User Access Token** (store-level).

### 2️⃣ Retrieve Stores
- **Endpoint:** `GET /api/stores` using the User Access Token.
- **UI:** Displays a simple list of stores associated with the merchant.

### 3️⃣ Activate Store Integration
- **Endpoint:** `POST /api/stores/{store_id}/activate` → calls Uber `/pos_data` endpoint.
- **UI:** 
  - Merchant selects a store → clicks **Activate**.
  - Shows immediate confirmation: "✅ Store Activated!"
  - Updates automatically when Uber sends the `store.provisioned` webhook.

### 4️⃣ Webhook Handling
- **Endpoint:** `POST /webhooks/store-provisioned`
- **Flow:**
  1. Uber sends webhook after activation.
  2. Server verifies signature and updates in-memory store status.
  3. UI updates in real-time using **Socket.IO** to reflect activation status.

---

## Tech Stack
- **Backend:** Node.js, Express
- **Frontend:** HTML, CSS, Vanilla JS, Socket.IO
- **Authentication:** OAuth2 (Authorization Code Flow)
- **In-memory storage:** Stores tokens, store mapping, activation status, webhook events
- **Real-time updates:** Socket.IO broadcasts webhook events to frontend

---

## Project Structure

```plaintext
uber-eats-mvp/
├─ backend/
│  ├─ server.js          # Main Express server: entry point, sets routes, middleware, OAuth callback, webhook endpoint
│  ├─ oauth.js           # OAuth flow, code exchange, token handling
│  ├─ api.js             # Uber API wrapper (GET /stores, POST activation)
│  ├─ webhook.js         # Webhook verification & handling (store.provisioned)
│  ├─ config.js          # (.env) handling, defines constants like API URLs
│  └─ storage.js         # In-memory token/state storage
├─ frontend/
│  ├─ index.html         # Minimal UI: buttons for “Connect with Uber Eats”, list of stores, activate button
│  ├─ script.js          # Frontend JS: calls backend endpoints, handles UI updates dynamically
│  └─ style.css          # Minimal styling (optional)
├─ .env                  # Stores sensitive credentials: client_id, client_secret, redirect_uri, etc.
├─ .gitignore            # Excludes node_modules, .env, logs, etc. from git
├─ package.json          # Node.js project dependencies and scripts
└─ README.md             # Instructions: how to run, deploy, and how OAuth/activation flow works


---

## Interview Flow & Notes

**Full Integration Journey Workflow:** [View Lucidchart Diagram](https://lucid.app/lucidchart/9ba4efa2-d7ea-4072-a5b6-03264c81cbe2/edit?invitationId=inv_ffb6cfa4-ab55-4434-b9c7-dffcf0a19bcb&page=0_0#)

### Merchant Flow
1. Click **Connect with Uber Eats** → OAuth login.
2. App retrieves access token.
3. Fetch merchant stores → display in UI.
4. Click **Activate** on a store → triggers `/pos_data`.
5. Webhook `store.provisioned` updates status → UI shows “Store Activated!”.

### Key Points
- UI should allow OAuth authorization, retrieve stores, and activate a store.
- Real-time updates via webhooks are implemented using Socket.IO.
- Focus on **functionality**, not styling.

---

**Author:** Liz Chen  
**Date:** 2025/09/20  
**Purpose:** Interview Technical Exercise — Uber Eats Marketplace API Integration MVP