# Uber Eats Integration MVP

This is a **minimal viable product (MVP)** demonstrating the Uber Eats Integration Activation flow, designed for interview purposes. The project implements a working backend and frontend that allows a merchant to
  1. Authorize my client ID vis OAuth(connect with Uber Eats)
  2. Use OAuth token to retrieve all stores associated with the merchant(retrieve merchant's stores) 
  3. Activate my app(client ID) on a store via Intergration Activation API(Link App to Store) 
  4. Handle webhooks for integration status updates

⚠️ Note: This MVP only uses in-memory storage for tokens, store mapping, and webhook events.

---

## Features / MVP Scope

### 1️⃣ OAuth Authorization & Token Exchange
- **Flow:** (Authorization Code Flow)
  1. Merchant clicks the button "Connect with Uber Eats" → triggers my app endpoint `/oauth/login`
  2. My app redirects merchant to Uber OAuth login:`GET https://auth.uber.com/oauth/v2/authorize`
  3. Merchant logs in Uber page and consent → Uber redirects merchant back to my app `/oauth/redirect` with an `authorization_code`
  4. My app backend calls Uber Token endpoint: POST https://auth.uber.com/oauth/v2/token to exchange the `authorization_code` for `User Access Token` and `refresh_token`
  5. Tokens are stored in-memory for this session
- **UI** "Connect with Uber Eats" button

### 2️⃣ Retrieve Merchant's all Stores
- **Flow:**
  1. On page load (After `/oauth/redirect`), my frontend automatically triggers my app `/api/stores`
  2. My app backend calls Uber Get Stores API: `GET https://api.uber.com/v1/delivery/stores` using the stored access token
  3. Response is mapped and stored in-memory (internalStoreMap, merchantStores) and returned to frontend 
- **UI:** Frontend automatically displays list of merchant's stores. Stores not yet activated show a "Link Store with App" button

### 3️⃣ Activate Store Integration (Link Application to Store)
- **Flow:** 
  1. Merchant clicks "Link Store with App" button → triggers my app endpoint `/api/stores/:store_id/activate`
  2. My app backend calls Uber Integration Activation API: `POST https://api.uber.com/v1/eats/stores/{store_id}/pos_data` with my client ID to link the store
  3. Backend sets `activationStatus[storeId] = "pending"` in memory. The store is not yet activated until webhook confirmation arrives 
- **UI:** Frontend shows alert "Activation requested! Waiting for Uber confirmation..." in the Your Stores section; the store remains in this state until the webhook is received

### 4️⃣ Webhook Handling
- **Flow:**
  1. Uber confirms store activation by sending webhook `store.provisioned` → triggers my app endpoint `/webhooks/store-provisioned` 
  2. My backend verifies Uber signature, updates `activationStatus[storeId] = 'activated"` → stores the webhook event in memory → emits real-time Socket.IO events to frontend → returns 200 response to Uber
  3. Frontend receives the Socket.IO event → updates Your Stores section to show "✅ Activated"
  4. Frontend logs the webhook event in "Webhook Events (last 50)" section.
- **UI:** Real-time updates:
  1. Store status changes from "Activation requested! Waiting for Uber confirmation..." → "✅ Activated" in Your Stores section
  2. Webhook events appear live in the Webhook Events section
- **Edge Case:**
  1. If the webhook never arrives (activation fails or network issue), the store remains in “Activation requested! Waiting for Uber confirmation…” state
  2. No automatic timeout or failure handling is implemented in this MVP 
  
---

## Interview Flow & Notes

**Full Integration Journey Workflow:** [View Lucidchart Diagram](https://lucid.app/lucidchart/9ba4efa2-d7ea-4072-a5b6-03264c81cbe2/edit?invitationId=inv_ffb6cfa4-ab55-4434-b9c7-dffcf0a19bcb&page=0_0#)

### Merchant Flow
1. Merchant clicks "Connect with Uber Eats" → Uber OAuth login → returns authorization_code.
2. App backend exchanges authorization_code at `/oauth/v2/token` for access/refresh tokens
3. App call Get Stores endpoint with access token to fetch merchant all stores → display all stores in UI.
4. Merchant clicks **Link Store with App** on a selected store → App calls Integration Activation API → triggers webhook on success
5. App's Webhook endpoint processes event (`store.provisioned`) → App's UI shows “Status: ✅ Store Activated”.

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

**Author:** Liz Chen  
**Date:** 2025/09/20  
**Purpose:** Interview Technical Exercise — Uber Eats Marketplace API Integration MVP