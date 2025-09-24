const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const http = require("http");
require("dotenv").config();

const oauthRoutes = require("./oauth");
const apiRoutes = require("./api");
const webhookRoutes = require("./webhook");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// --------------------
// Setup Socket.IO
// --------------------
const { Server } = require("socket.io");
const io = new Server(server, { cors: { origin: "*" } });
app.set("io", io);

// --------------------
// Middleware
// --------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.socket.io"],
        connectSrc: [
          "'self'",
          "ws://localhost:3000",
          "ws://127.0.0.1:3000",
          "https://cdn.socket.io"
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"]
      }
    }
  })
);

app.use(cors());
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    }
  })
);

// Request logging
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.send("🚀 Uber Eats MVP Backend is healthy!");
});

// --------------------
// Routes
// --------------------
app.use("/oauth", oauthRoutes);
app.use("/api", apiRoutes); // <--- Mount API routes
app.use("/webhooks", webhookRoutes);

// --------------------
// Static frontend
// --------------------
app.use(express.static(path.join(__dirname, "../frontend")));
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// --------------------
// Error handler
// --------------------
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack || err.message);
  res.status(500).json({
    error: "Internal Server Error",
    details: err.message
  });
});

// --------------------
// Track open connections (for graceful shutdown)
// --------------------
const connections = new Set();
server.on("connection", (socket) => {
  connections.add(socket);
  socket.on("close", () => connections.delete(socket));
});

// --------------------
// Start server
// --------------------
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`   - OAuth routes at /oauth/*`);
  console.log(`   - API routes at /api/*`);
  console.log(`   - Webhooks listening at /webhooks/*`);
});

// --------------------
// Graceful shutdown
// --------------------
process.on("SIGINT", () => {
  console.log("🛑 Server shutting down...");

  server.close(() => {
    console.log("✅ Server closed cleanly");
    process.exit(0);
  });

  connections.forEach((socket) => socket.destroy());

  setTimeout(() => {
    console.error("⚠️ Forcing exit after 5s");
    process.exit(1);
  }, 5000);
});
