// backend/api.js

const express = require("express");
const axios = require("axios");
const router = express.Router();
const { UBER_API_BASE_URL } = require("./config");
const storage = require("./storage");

/**
 * Helper: map Uber store UUID to merchant's internal store ID (not provided by Uber)
 */
function mapStore(store) {
  const internalId = store.name.replace(/\s+/g, "_") + "_" + store.store_id.slice(0, 4);

  const duplicate = Object.values(storage.internalStoreMap).find(
    (s) =>
      s.external_store_id === store.store_id &&
      s.address === store.location?.address
  );

  if (duplicate) {
    console.warn(
      `⚠️ Duplicate external_store_id detected for ${store.name} at ${store.location?.address}`
    );
  }

  storage.internalStoreMap[store.store_id] = {
    internalId,
    name: store.name,
    address: store.location?.address,
    external_store_id: store.store_id,
  };

  return { ...store, internalId };
}

/**
 * GET /api/stores
 * Uber API: GET https://api.uber.com/v1/delivery/stores
 * Request body: { next_page_token, page_size }
 */
router.get("/stores", async (req, res) => {
  const userTokenObj = storage.userTokens["demoMerchant"];
  if (!userTokenObj || !userTokenObj.access_token) {
    return res.status(401).send(
      "401 Unauthorized: ⚠️ No access token found. 👉 Please log in with Uber and approve authorization consent."
    );
  }

  try {
    const response = await axios.get(
      `${UBER_API_BASE_URL}/v1/delivery/stores`,
      {
        headers: { Authorization: `Bearer ${userTokenObj.access_token}` },
        data: {
          next_page_token: req.query.next_page_token || null,
          page_size: parseInt(req.query.page_size) || 50
        }
      }
    );

    const stores = (response.data.data || []).map(mapStore);
    storage.stores["demoMerchant"] = stores;

    res.status(200).json(stores);
  } catch (err) {
    const status = err.response?.status || 500;
    if (status === 400) return res.status(400).send("400 Bad Request: ⚠️ Invalid request.");
    else if (status === 401) return res.status(401).send("401 Unauthorized: ⚠️ Invalid or expired token.");
    else if (status === 404) return res.status(404).send("404 Not Found: ⚠️ Store data not found.");
    else {
      console.error(err.response?.data || err.message);
      return res.status(500).send("500 Internal Server Error: ⚠️ Uber API failed unexpectedly.");
    }
  }
});

/**
 * POST /api/stores/:id/activate
 * Uber API: POST https://api.uber.com/v1/eats/stores/{store_id}/pos_data
 */
router.post("/stores/:id/activate", async (req, res) => {
  const userTokenObj = storage.userTokens["demoMerchant"];
  if (!userTokenObj || !userTokenObj.access_token) {
    return res.status(401).send(
      "401 Unauthorized: ⚠️ No access token found. 👉 Please log in with Uber and approve authorization consent."
    );
  }

  const storeId = req.params.id;
  const storeMapping = storage.internalStoreMap[storeId];

  if (!storeMapping) {
    return res.status(404).send(
      "404 Not Found: ⚠️ Store mapping not found. 👉 Fetch stores first."
    );
  }

  try {
    const payload = {
      allowed_customer_requests: {
        allow_single_use_items_requests: false,
        allow_special_instruction_requests: false
      },
      integrator_brand_id: "app-brand-1jj9th32",        // Replace with your app's brand ID
      integrator_store_id: storeMapping.internalId,     // Your internal store ID
      is_order_manager: true,
      merchant_store_id: storeId,                        // Uber store ID
      require_manual_acceptance: false,
      store_configuration_data: "string",
      webhooks_config: {
        order_release_webhooks: { is_enabled: true },
        schedule_order_webhooks: { is_enabled: true },
        delivery_status_webhooks: { is_enabled: true },
        webhooks_version: "1.0.0"
      }
    };

    await axios.post(
      `${UBER_API_BASE_URL}/v1/eats/stores/${storeId}/pos_data`,
      payload,
      { headers: { Authorization: `Bearer ${userTokenObj.access_token}` } }
    );

    storage.activationStatus[storeId] = true;
    res.status(200).send(`200 OK: ✅ Store ${storeMapping.name} activated successfully!`);
  } catch (err) {
    const status = err.response?.status || 500;
    if (status === 400) return res.status(400).send("400 Bad Request: ⚠️ Invalid activation payload.");
    else if (status === 401) return res.status(401).send("401 Unauthorized: ⚠️ Invalid or expired token.");
    else if (status === 404) return res.status(404).send("404 Not Found: ⚠️ Store not found.");
    else {
      console.error(err.response?.data || err.message);
      return res.status(500).send("500 Internal Server Error: ⚠️ Uber API failed unexpectedly.");
    }
  }
});

/**
 * GET /api/debug/events
 * Returns all logged webhook events (for frontend display)
 */
router.get("/debug/events", (req, res) => {
  res.status(200).json(storage.events.map(e => ({ event: e })));
});

module.exports = router;
