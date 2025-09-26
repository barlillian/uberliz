const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const storage = require("./storage");
const { getStorePosData } = require("./api");
require("dotenv").config();

// --------------------
// Middleware: capture rawBody for signature verification
// --------------------
router.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf.toString(); }
}));

// --------------------
// Utility: verify Uber signature
// --------------------
function verifyUberSignature(req) {
  const signature = req.headers["x-uber-signature"];
  if (!signature) return false;

  const computed = crypto
    .createHmac("sha256", process.env.WEBHOOK_SECRET)
    .update(req.rawBody || "")
    .digest("hex");

  return signature === computed;
}

// --------------------
// Webhook endpoint
// --------------------
router.post("/", async (req, res) => {
  const io = req.app.get("io"); // Socket.IO instance

  if (!verifyUberSignature(req)) {
    console.error("❌ Invalid webhook signature", req.body);
    return res.sendStatus(401);
  }

  const event = req.body;
  const storeId = event.store_id;

  console.log("📩 Received Uber webhook:", event);

  // ✅ Log latest 50 events
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: event.event_type,
    storeId: storeId || null,
    raw: event
  };
  storage.events.unshift(logEntry); // latest on top
  if (storage.events.length > 50) storage.events.pop();

  // Emit real-time event to frontend
  if (io) io.emit("webhookEvent", logEntry);

  // ✅ Only update activationStatus for relevant events
  if (["store.provisioned", "store.deprovisioned"].includes(event.event_type) && storeId) {
    try {
      // Use backend API helper to call GET /get_pos_data/:store_id (client credentials)
      const posData = await getStorePosData(storeId);
      storage.activationStatus[storeId] = posData.integration_enabled ? "activated" : "deactivated";
      console.log(`🔄 Updated activationStatus from GET /get_pos_data for store ${storeId}:`, storage.activationStatus[storeId]);

      if (io) io.emit("storeStatusUpdated", { storeId, status: storage.activationStatus[storeId] });
    } catch (err) {
      console.error(`❌ Failed to update store status from GET /get_pos_data for store ${storeId}`, err.message);
    }
  }

  console.log("✅ Responded 200 to Uber webhook:", event.event_type, "for store:", storeId);
  return res.sendStatus(200);
});

module.exports = router;
