/**
 * In-memory storage for Uber Eats MVP
 * - Stores user tokens, store list, activation status, OAuth state
 * - Internal mapping: Uber store UUID → merchant internal store ID
 * - Webhook event logs for debugging
 *
 * Notes:
 * - userTokens will be populated after real OAuth login
 * - internalStoreMap will be populated when fetching stores from Uber
 * - events is just an array for debugging — do not rely on it in production
 */

const storage = {
  userTokens: {},        // { merchantId: accessToken }
  stores: {},            // { merchantId: [storeList] }
  internalStoreMap: {},  // { uberStoreUUID: {internalId, name, address, external_store_id} }
  activationStatus: {},  // { storeId: "pending" | "activated" }
  oauthState: {},        // { state: merchantId } for CSRF protection

  // 🔹 Keep history of received webhook events for debugging
  events: []             // [ { timestamp, event } ]
};

module.exports = storage;
