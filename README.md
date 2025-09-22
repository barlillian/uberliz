# Uber Eats Integration MVP

This is a **minimal viable product (MVP)** demonstrating the Uber Eats Integration Activation flow, designed for interview purposes. The project implements a working backend and frontend that allows a merchant to authorize my client ID vis OAuth(connect with Uber Eats), use OAuth token to retrieve all stores associated with the merchant(retrieve merchant's stores), activate my app(client ID) on a store by calling the intergration Activation API(activate a store integration), and handle webhook for integration status updates.

---

## Features / MVP Scope

### 1️⃣ OAuth Authorization 
- **Button:** "Connect with Uber Eats" on the frontend.
- **Flow:** Follows the **Authorization Code Flow**:
  1. Merchant clicks the button "Connect with Uber Eats"
  2. Redirects to Uber OAuth login (`GET https://auth.uber.com/oauth/v2/authorize`)
  3. Merchant logs in → Uber redirects back to my app `/oauth/redirect` with an `authorization_code`.

### 2️⃣ Token Enchange
- **Endpoint:** Call Authentication endpoint(authorization_code flow): `POST /https://auth.uber.com/oauth/v2/token`
  1. My backend exchanges authorization_code for **User Access Token** and refresh_token

### 3️⃣ Retrieve merchant's all Stores
- **Endpoint:** Call Get Stores endpoint: `GET /https://api.uber.com/v1/delivery/stores` using the User Access Token.
- **UI:** Displays the merchant's all stores

### 4️⃣ Activate Store Integration (Link Application to Store)
- **Endpoint:** Call Integration Activation endpoint: `POST https://api.uber.com/v1/eats/stores/{store_id}/pos_data` to link my client ID with selected store 
- **UI:** 
  - Merchant selects a store → clicks **Link Store with App**.
  - Confirm success when Uber sends the `store.provisioned` webhook, then App UI updates automatically and displays: "Status: ✅ Store Activated" next to each store

### 5️⃣ Webhook Handling
- **Endpoint(I built):** Uber notified store activation confirmation and trigger my endpoint `POST /webhooks/store-provisioned`to receive webhook events(integration status update), and display in UI and return 200 response to Uber
- **Flow:**
  1. Uber sends webhook to notify confirmation of store activation.
  2. My app verifies Uber's signature, parses webhook response and updates in-memory store status, and returns 200 response to Uber
  3. UI updates in real-time using **Socket.IO** to reflect activation status.

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