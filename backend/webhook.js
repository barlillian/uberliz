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

  // Use rawBody from server.js middleware
  const computed = crypto
    .createHmac("sha256", process.env.UBER_CLIENT_SECRET)
    .update(req.rawBody || "")
    .digest("hex");

  return signature === computed;
}

// --------------------
// Webhook endpoint for all Uber events
// --------------------
router.post("/", (req, res) => {
  const io = req.app.get("io"); // Socket.IO instance

  // 1️⃣ Verify signature
  if (!verifyUberSignature(req)) {
    console.error("❌ Invalid webhook signature", req.body);
    return res.sendStatus(401);
  }

  const event = req.body;
  const storeId = event.store_id;

  console.log("📩 Received Uber webhook:", event);

  // 2️⃣ Update activation status for store.provisioned
  if (event.event_type === "store.provisioned" && storeId) {
    storage.activationStatus[storeId] = "activated";
    console.log(`✅ Store provisioned: ${storeId}`);
  }

  if (event.event_type === "store.deprovisioned" && storeId) {
    storage.activationStatus[storeId] = "deactivated";
    console.log(`⚠️ Store deprovisioned: ${storeId}`);
  }

  // 3️⃣ Log all events
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: event.event_type,
    storeId: storeId || null,
    raw: event
  };
  storage.events.push(logEntry);

  // 4️⃣ Emit real-time events to frontend
  if (io) {
    // Emit specific storeProvisioned/deprovisioned events for UI update
    if (storeId) {
      if (event.event_type === "store.provisioned") io.emit("storeProvisioned", { storeId });
      if (event.event_type === "store.deprovisioned") io.emit("storeDeprovisioned", { storeId });
    }

    // Emit all events for real-time debug
    io.emit("webhookEvent", logEntry);
  }

  // 5️⃣ Respond with empty 200 to Uber
  return res.sendStatus(200);
});

module.exports = router;
