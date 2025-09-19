// backend/storage.js

// In-memory storage for demo purposes
// You can store user tokens, store list, activation status, and OAuth state

const storage = {
  userTokens: {},        // { merchantId: accessToken }
  stores: {},            // { merchantId: [storeList] }
  activationStatus: {},  // { storeId: "pending" | "activated" }
  oauthState: {},        // { state: merchantId } for CSRF protection
};

module.exports = storage;