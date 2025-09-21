const express = require("express");
const axios = require("axios");
const router = express.Router();
const { UBER_API_BASE_URL } = require("./config");
const storage = require("./storage");
const oauth = require("./oauth");
const { INTEGRATOR_BRAND_ID = "app-brand-1jj9th32" } = process.env;

// Map Uber store UUID → merchant-provided ID
function mapStore(merchantId, uberStore) {
  storage.internalStoreMap[uberStore.store_id] = {
    merchantId,
    name: uberStore.name,
    address: uberStore.location?.address,
    external_store_id: merchantId
  };
  if (!storage.activationStatus[uberStore.store_id]) storage.activationStatus[uberStore.store_id] = "pending";
  return { ...uberStore, isActivated: storage.activationStatus[uberStore.store_id] === "activated" };
}

// API error formatter
function sendApiError(res, status, uberData, nextAction) {
  res.status(status).json({
    status,
    uber_code: uberData?.code || "unknown_error",
    uber_message: `⚠️ ${uberData?.message || uberData?.error || "No message provided"}`,
    uber_metadata: uberData?.metadata || null,
    next_action: `👉 ${nextAction}`
  });
}

// GET /api/stores
router.get("/stores", async (req, res) => {
  try {
    const token = await oauth.getValidToken();
    const response = await axios.get(`${UBER_API_BASE_URL}/v1/delivery/stores`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        next_page_token: req.query.next_page_token || null,
        page_size: parseInt(req.query.page_size) || 50
      }
    });

    const stores = (response.data.data || []).map(store => mapStore(store.store_id, store));
    storage.merchantStores["demoMerchant"] = stores;
    res.status(200).json(stores);

  } catch (err) {
    const status = err.response?.status || 500;
    const uberData = err.response?.data || {};
    let nextAction = "Check request and retry";

    switch (status) {
      case 400: nextAction = "Check request parameters and retry"; break;
      case 401: nextAction = "Token may be expired. Ensure eats.pos_provisioning scope is included"; break;
      case 404: nextAction = "Ensure store exists and fetch stores list first"; break;
      case 500: nextAction = "Retry later or contact Uber support"; break;
    }

    sendApiError(res, status, uberData, nextAction);
  }
});

// POST /api/stores/:store_id/activate
router.post("/stores/:store_id/activate", async (req, res) => {
  const uberStoreId = req.params.store_id;
  const storeMapping = storage.internalStoreMap[uberStoreId];

  if (!storeMapping) return sendApiError(res, 404, { message: "Store mapping not found" }, "Fetch stores first");

  try {
    const token = await oauth.getValidToken();
    const payload = {
      allowed_customer_requests: { allow_single_use_items_requests: false, allow_special_instruction_requests: false },
      integrator_brand_id: INTEGRATOR_BRAND_ID,
      integrator_store_id: `app-${uberStoreId}`,
      is_order_manager: true,
      merchant_store_id: storeMapping.merchantId,
      require_manual_acceptance: false,
      store_configuration_data: JSON.stringify({ store_type: "restaurant", accepts_pickup: true, accepts_delivery: true }),
      webhooks_config: { order_release_webhooks: { is_enabled: true }, schedule_order_webhooks: { is_enabled: true }, delivery_status_webhooks: { is_enabled: true }, webhooks_version: "1.0.0" }
    };

    await axios.post(`${UBER_API_BASE_URL}/v1/eats/stores/${uberStoreId}/pos_data`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    storage.activationStatus[uberStoreId] = "activated";
    res.status(200).json({ status: 200, message: `Store ${storeMapping.merchantId} activated successfully!` });

  } catch (err) {
    const status = err.response?.status || 500;
    const uberData = err.response?.data || {};
    let nextAction = "Check request and retry";

    switch (status) {
      case 400: nextAction = "Check activation payload for errors"; break;
      case 401: nextAction = "Token may be expired. Ensure eats.pos_provisioning scope is included"; break;
      case 404: nextAction = "Ensure store exists and fetch stores list first"; break;
      case 500: nextAction = "Retry later or contact Uber support"; break;
    }

    sendApiError(res, status, uberData, nextAction);
  }
});

// GET /api/debug/events
router.get("/debug/events", (req, res) => {
  res.status(200).json(storage.events.map(e => ({ event: e })));
});

module.exports = router;
