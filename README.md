# Uber Eats Integration MVP

This is a **minimal viable product (MVP)** demonstrating the Uber Eats Integration Activation flow, designed for interview purposes. The project implements a working backend and frontend that allows a merchant to
  1. Authorize my client ID vis OAuth(connect with Uber Eats)
  2. Use OAuth token to retrieve all stores associated with the merchant(retrieve merchant's stores) 
  3. Activate my app(client ID) on a store via Intergration Activation API(Link App to Store) 
  4. Handle webhooks for integration status updates

⚠️ Note: This MVP only uses in-memory storage for tokens, store mapping, and webhook events.

---

**Brief Full Integration Journey Workflow:** [View Lucidchart Diagram](https://lucid.app/lucidchart/9ba4efa2-d7ea-4072-a5b6-03264c81cbe2/edit?invitationId=inv_ffb6cfa4-ab55-4434-b9c7-dffcf0a19bcb&page=0_0#)

---

## Features / MVP Scope

### 1️⃣ OAuth Authorization & Token Exchange
- **Flow:** (Authorization Code Flow)
  1. Merchant clicks **"Connect with Uber Eats"** → triggers app endpoint `/oauth/login`
  2. App redirects merchant to Uber OAuth:  
     `GET https://auth.uber.com/oauth/v2/authorize`
  3. Merchant logs in and consents → Uber redirects back to app `/oauth/redirect?code=...`
  4. Backend exchanges `authorization_code` for **Access Token** + **Refresh Token** via:  
     `POST https://auth.uber.com/oauth/v2/token`
  5. Tokens are stored **in-memory** for this session
- **UI:** "Connect with Uber Eats" button  

---

### 2️⃣ Retrieve Merchant’s Stores
- **Flow:**
  1. After OAuth success, frontend automatically calls `/api/stores`
  2. Backend calls Uber API:  
     `GET https://api.uber.com/v1/delivery/stores` (using stored user token)
  3. Response is mapped into local memory (`internalStoreMap`, `merchantStores`) and sent to frontend
  4. Each store is also checked against `activationStatus` (from previous webhooks or `/get_pos_data`)
- **UI:**  
  - Frontend displays list of stores  
  - Stores not yet activated show **👉 Link App to Store** button  

---

### 3️⃣ Activate Store Integration (Link App to Store)
- **Flow:** 
  1. Merchant clicks **"Link App to Store"** → frontend calls `/api/post_pos_data/:store_id`
  2. Backend calls Uber API:  
     `POST https://api.uber.com/v1/eats/stores/{store_id}/pos_data` with integration payload
  3. Backend sets `activationStatus[storeId] = "pending"` in memory
  4. Store is not fully activated until Uber webhook confirms it
- **UI:**  
  - Store shows **⏳ Awaiting Uber approval** until webhook arrives to trigger next step for integration status confirm  
  - No manual refresh required  

---

### 4️⃣ Webhook Handling
- **Flow:**
  1. Uber sends webhooks (`store.provisioned` / `store.deprovisioned`) to app endpoint `/webhooks`
  2. Backend verifies Uber HMAC signature (`x-uber-signature`)
  3. Event is logged in memory (`storage.events`, capped at 50)  
     and broadcasted to frontend via **Socket.IO**
  4. **Provisioned case:**  
     - Backend calls `GET /v1/eats/stores/{store_id}/pos_data` (client credentials)  
     - Confirms `integration_enabled === true`  
     - Updates `activationStatus[storeId] = "activated"`  
  5. **Deprovisioned case:**  
     - Backend directly sets `activationStatus[storeId] = "deactivated"`  
     - Skips extra API call (since Uber’s deprovisioned event is final)
  6. Frontend receives Socket.IO update → updates store status in UI
- **UI:**  
  - Store flips live between:  
    - "⏳ Awaiting Uber approval" → "✅ Activated" (on provisioned + confirmed)  
    - "✅ Activated" → "👉 Link App to Store" (on deprovisioned)  
  - Webhook Events panel updates live with last 50 events  

---

### 5️⃣ Real-Time Dashboard
- **Stores Section:**  
  - Shows each store with its current activation status  
  - Updates instantly on webhook events via Socket.IO  
- **Webhook Events Section:**  
  - Displays a live log of the last 50 webhook payloads  
  - Expandable `[+Details]` view for inspecting raw event data  

---

### 6️⃣ Edge Cases / Notes
- **Provisioned webhook** can be triggered by both `POST /pos_data` or `PATCH /pos_data` → that’s why backend confirms with `GET /pos_data` before marking "✅ Activated".  
- **Deprovisioned webhook** is reliable so directly marked "👉 Link App to Store".   
- **Events & tokens** are stored **in-memory only** (lost on server restart).  
- **No retry/timeout handling** for failed activations in this MVP.  

---

## 🛠️ Tech Stack
- **Backend:** Node.js, Express  
- **Frontend:** HTML, CSS, Vanilla JS, Socket.IO  
- **Authentication:** OAuth2 (Authorization Code Flow)  
- **In-memory storage:** Tokens, store mapping, activation status, webhook events  
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

**Author:** Liz Chen  
**Date:** 2025/09/20  
**Purpose:** Interview Technical Exercise — Uber Eats Marketplace API Integration MVP