const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const storage = require("./storage");
require("dotenv").config();

router.use(express.json());

// Utility: verify Uber signature
function verifyUberSignature(req) {
  const signature = req.headers["x-uber-signature"];
  if (!signature) return false;

  const computed = crypto
    .createHmac("sha256", process.env.UBER_CLIENT_SECRET)
    .update(JSON.stringify(req.body))
    .digest("hex");

  return signature === computed;
}

// Webhook endpoint for store.provisioned
router.post("/webhooks/store-provisioned", (req, res) => {
  // 1. Verify Uber signature
  if (!verifyUberSignature(req)) {
    console.error("❌ Invalid webhook signature");
    return res.sendStatus(401);
  }

  const event = req.body;
  console.log("📩 Received webhook:", event);

  // 2. Only handle store.provisioned
  if (event.event_type !== "store.provisioned") {
    console.log(`ℹ️ Ignored event: ${event.event_type}`);
    return res.sendStatus(200);
  }

  const storeId = event.store_id;
  if (!storeId) {
    console.error("❌ Missing store_id in event");
    return res.sendStatus(400);
  }

  // 3. Update activation status
  storage.activationStatus[storeId] = "activated";

  // 4. Log event in memory
  storage.events.push({
    timestamp: new Date().toISOString(),
    type: event.event_type,
    storeId,
    raw: event
  });

  console.log(`✅ Store provisioned: ${storeId}`);
  return res.sendStatus(200); // ✅ Empty body required by Uber
});

module.exports = router;
