const express = require("express");
const axios = require("axios");
const router = express.Router();
const storage = require("./storage");
const oauth = require("./oauth");
const { UBER_API_BASE_URL } = require("./config");
const { INTEGRATOR_BRAND_ID = "app-brand-1jj9th32" } = process.env;

// --------------------
// Helper: map store into internalStoreMap
// --------------------
function mapStore(tokenKey, store) {
  const storeId = store.id;
  if (!storeId) throw new Error("Store ID missing from Uber response");

  const merchantStoreId = `${store.name.replace(/\s+/g, "_")}-${storeId.slice(0, 8)}`;

  storage.internalStoreMap[storeId] = {
    tokenKey,
    name: store.name,
    address: store.location?.street_address_line_one,
    merchant_store_id: merchantStoreId
  };

  if (!storage.activationStatus[storeId]) {
    storage.activationStatus[storeId] = "pending";
  }

  return {
    ...store,
    isActivated: storage.activationStatus[storeId] === "activated"
  };
}

// --------------------
// Helper: send formatted API error (always JSON)
// --------------------
function sendApiError(res, status, uberData, nextAction) {
  res.status(status).json({
    status,
    uber_code: uberData?.code || "unknown_error",
    uber_message: `⚠️ ${uberData?.message || uberData?.error || "No message provided"}`,
    uber_metadata: uberData?.metadata || null,
    next_action: `👉 ${nextAction}`
  });
}

// --------------------
// GET /api/stores
// --------------------
router.get("/stores", async (req, res) => {
  try {
    const tokenKeys = Object.keys(storage.userTokens);
    if (tokenKeys.length === 0) {
      return res.status(400).json({
        status: 400,
        message: "⚠️ No authorized session. Complete OAuth first."
      });
    }

    const tokenKey = tokenKeys[tokenKeys.length - 1];
    const token = await oauth.getValidToken(tokenKey);

    const response = await axios.get(`${UBER_API_BASE_URL}/v1/delivery/stores`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { page_size: 50 }
    });

    const storesFromApi = response.data.stores || [];
    const stores = storesFromApi.map(store => mapStore(tokenKey, store));

    storage.merchantStores[tokenKey] = stores;

    console.log(`✅ /api/stores fetched ${stores.length} stores`);
    res.status(200).json(stores);
  } catch (err) {
    console.error("❌ /api/stores error:", err.response?.data || err.message);

    const status = err.response?.status || 500;
    const uberData = err.response?.data || {};
    let nextAction = "Check request and retry";

    switch (status) {
      case 400: nextAction = "Check request parameters"; break;
      case 401: nextAction = "Token may be expired or lacks eats.pos_provisioning scope"; break;
      case 404: nextAction = "Check store_id"; break;
    }

    // Always respond with JSON, even on error
    sendApiError(res, status, uberData, nextAction);
  }
});

// --------------------
// POST /api/stores/:store_id/activate
// --------------------
router.post("/stores/:store_id/activate", async (req, res) => {
  const storeId = req.params.store_id;
  console.log("🔹 /api/stores/:store_id/activate hit for:", storeId);

  let storeMapping = storage.internalStoreMap[storeId];

  if (!storeMapping) {
    const tokenKeys = Object.keys(storage.userTokens);
    for (const key of tokenKeys) {
      const stores = storage.merchantStores[key] || [];
      const found = stores.find(s => s.id === storeId);
      if (found) {
        storeMapping = storage.internalStoreMap[storeId] = {
          tokenKey: key,
          name: found.name,
          address: found.location?.street_address_line_one,
          merchant_store_id: `${found.name.replace(/\s+/g, "_")}-${storeId.slice(0, 8)}`
        };
        break;
      }
    }
  }

  if (!storeMapping) {
    return sendApiError(
      res,
      404,
      { message: "Store mapping not found" },
      "Ensure store_id is valid and fetched from /api/stores"
    );
  }

  const tokenKey = storeMapping.tokenKey;

  try {
    const token = await oauth.getValidToken(tokenKey);

    const payload = {
      allowed_customer_requests: {
        allow_single_use_items_requests: false,
        allow_special_instruction_requests: false
      },
      integrator_brand_id: INTEGRATOR_BRAND_ID,
      integrator_store_id: `app-${storeId}`,
      is_order_manager: true,
      merchant_store_id: storeMapping.merchant_store_id,
      require_manual_acceptance: false,
      store_configuration_data: JSON.stringify({
        store_type: "restaurant",
        accepts_pickup: true,
        accepts_delivery: true
      }),
      webhooks_config: {
        order_release_webhooks: { is_enabled: true },
        schedule_order_webhooks: { is_enabled: true },
        delivery_status_webhooks: { is_enabled: true },
        webhooks_version: "1.0.0"
      }
    };

    await axios.post(`${UBER_API_BASE_URL}/v1/eats/stores/${storeId}/pos_data`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    storage.activationStatus[storeId] = "pending";

    res.status(200).json({
      status: 200,
      message: `Store ${storeMapping.name} activation requested! Waiting for Uber confirmation...`
    });
  } catch (err) {
    console.error("❌ /api/stores/:store_id/activate error:", err.response?.data || err.message);

    const status = err.response?.status || 500;
    const uberData = err.response?.data || {};
    let nextAction = "Check request and retry";

    switch (status) {
      case 400: nextAction = "Check activation payload"; break;
      case 401: nextAction = "Token may be expired or lacks eats.pos_provisioning scope"; break;
      case 404: nextAction = "Ensure store_id is valid"; break;
    }

    sendApiError(res, status, uberData, nextAction);
  }
});

// --------------------
// Debug routes
// --------------------
router.get("/debug/events", (req, res) => {
  res.status(200).json(storage.events.map(e => ({ event: e })));
});

router.get("/debug/tokens", (req, res) => {
  res.json(storage.userTokens);
});

router.get("/debug/clear", (req, res) => {
  storage.clearAll();
  res.send("✅ Storage cleared. Starting fresh.");
});

module.exports = router;
