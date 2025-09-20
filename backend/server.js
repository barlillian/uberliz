// backend/server.js

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const oauthRoutes = require("./oauth");
const apiRoutes = require("./api");
const webhookRoutes = require("./webhook");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Health check route
app.get("/health", (req, res) => {
  res.send("🚀 Uber Eats MVP Backend is healthy and running!");
});

// Mount backend routes
app.use("/oauth", oauthRoutes);
app.use("/api", apiRoutes);
app.use("/webhooks", webhookRoutes);

// Serve static frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Fallback route: serve frontend index.html for unmatched GET requests
app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`   - OAuth routes at /oauth/*`);
  console.log(`   - API routes at /api/*`);
  console.log(`   - Webhook listening at /webhooks/*`);
  console.log(`   - Frontend served at http://localhost:${PORT}/index.html`);
});
