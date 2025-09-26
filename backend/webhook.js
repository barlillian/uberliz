const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const storage = require("./storage");
require("dotenv").config();

// --------------------
// Middleware
// --------------------
router.use(express.json());

// --------------------
// Utility: verify Uber signature
// --------------------
function verifyUberSignature(req) {
  const signature = req.headers["x-uber-signature"];
  if (!signature) return false;

  // Use separate webhook secret from .env
  const computed = crypto
    .createHmac("sha256", process.env.WEBHOOK_SECRET)
    .update(req.rawBody || "")
    .digest("hex");

  return signature === computed;
}

// --------------------
// Webhook endpoint for all Uber events
// --------------------
router.post("/", (req, res) => {
  const io = req.app.get("io"); // Socket.IO instance

  if (!verifyUberSignature(req)) {
    console.error("❌ Invalid webhook signature", req.body);
    return res.sendStatus(401);
  }

  const event = req.body;
  const storeId = event.store_id;

  console.log("📩 Received Uber webhook:", event);

  // ✅ Update activation status
  if (event.event_type === "store.provisioned" && storeId) {
    storage.activationStatus[storeId] = "activated";
    console.log(`✅ Store provisioned: ${storeId}`);
  }

  if (event.event_type === "store.deprovisioned" && storeId) {
    storage.activationStatus[storeId] = "deactivated";
    console.log(`⚠️ Store deprovisioned: ${storeId}`);
  }

  // ✅ Log all events without merchant ID
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: event.event_type,
    storeId: storeId || null,
    raw: event
  };
  storage.events.push(logEntry);

  // Emit real-time events
  if (io) {
    if (storeId) {
      if (event.event_type === "store.provisioned") io.emit("storeProvisioned", { storeId });
      if (event.event_type === "store.deprovisioned") io.emit("storeDeprovisioned", { storeId });
    }
    io.emit("webhookEvent", logEntry);
  }

  // 👇 Add this console log so you know you responded 200
  console.log("✅ Responded 200 to Uber webhook:", event.event_type, "for store:", storeId);

  return res.sendStatus(200);
});

module.exports = router;
