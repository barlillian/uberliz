const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const http = require("http"); // Add HTTP server
require("dotenv").config();

const oauthRoutes = require("./oauth");
const apiRoutes = require("./api");
const webhookRoutes = require("./webhook");

const app = express();
const server = http.createServer(app); // wrap app in HTTP server
const PORT = process.env.PORT || 3000;

// Setup Socket.IO
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: { origin: "*" } // allow any frontend origin for demo
});
app.set("io", io); // make io accessible in routes

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf.toString(); }
}));

app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// Health check
app.get("/health", (req, res) => res.send("🚀 Uber Eats MVP Backend is healthy!"));

// Routes
app.use("/oauth", oauthRoutes);
app.use("/api", apiRoutes);
app.use("/webhooks", webhookRoutes);

// Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));
app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Error handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack || err.message);
  res.status(500).json({ error: "Internal Server Error", details: err.message });
});

// Start server
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`   - OAuth routes at /oauth/*`);
  console.log(`   - API routes at /api/*`);
  console.log(`   - Webhook listening at /webhooks/*`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("🛑 Server shutting down...");
  server.close(() => {
    console.log("✅ Server closed cleanly");
    process.exit(0);
  });
});
