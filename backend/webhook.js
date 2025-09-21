// backend/webhook.js

const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const storage = require("./storage");
require("dotenv").config();

router.use(express.json());

// --------------------
// Utility: verify Uber signature
// --------------------
function verifyUberSignature(req) {
  const signature = req.headers["x-uber-signature"];
  if (!signature) return false;

  const computed = crypto
    .createHmac("sha256", process.env.UBER_CLIENT_SECRET)
    .update(JSON.stringify(req.body))
    .digest("hex");

  return signature === computed;
}

// --------------------
// Webhook endpoint for all Uber events
// --------------------
router.post("/webhooks/store-provisioned", (req, res) => {
  const io = req.app.get("io"); // get Socket.IO instance

  // 1️⃣ Verify signature
  if (!verifyUberSignature(req)) {
    console.error("❌ Invalid webhook signature", req.body);
    return res.sendStatus(401);
  }

  const event = req.body;
  console.log("📩 Received webhook:", event);

  const storeId = event.store_id;

  // 2️⃣ Handle store.provisioned
  if (event.event_type === "store.provisioned") {
    if (!storeId) {
      console.error("❌ Missing store_id in event", event);
      return res.sendStatus(400);
    }

    // Update activation status
    storage.activationStatus[storeId] = "activated";
    console.log(`✅ Store provisioned: ${storeId}`);
  }

  // 3️⃣ Log all events in memory
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: event.event_type,
    storeId: storeId || null,
    raw: event
  };
  storage.events.push(logEntry);

  // 4️⃣ Emit real-time events to connected clients
  if (io) {
    // Emit specific storeProvisioned event
    if (event.event_type === "store.provisioned" && storeId) {
      io.emit("storeProvisioned", { storeId });
    }

    // Emit all webhook events for real-time debug
    io.emit("webhookEvent", logEntry);
  }

  // 5️⃣ Respond to Uber with empty 200
  return res.sendStatus(200);
});

module.exports = router;
