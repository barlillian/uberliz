const express = require("express");
const axios = require("axios");
const qs = require("querystring");
const crypto = require("crypto");
const router = express.Router();
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = require("./config");
const storage = require("./storage");

// --------------------
// Step 1: Redirect user to Uber OAuth
// --------------------
router.get("/login", (req, res) => {
  const state = crypto.randomBytes(8).toString("hex");
  storage.oauthStates[state] = true;

  const oauthUrl =
    `https://auth.uber.com/oauth/v2/authorize?` +
    `client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=eats.pos_provisioning` +
    `&state=${state}`;

  res.redirect(oauthUrl);
});

// --------------------
// Step 2: Uber redirects back with code → exchange for tokens
// --------------------
router.get("/redirect", async (req, res) => {
  const { code, error, state } = req.query;

  // Handle OAuth errors
  if (error) return res.status(403).send(`⚠️ Authorization failed: ${error}`);
  if (!code) return res.status(400).send(`⚠️ Missing authorization code.`);

  // Graceful fallback if state missing (common on Render cold starts)
  if (!state || !storage.oauthStates[state]) {
    console.warn("⚠️ Missing or invalid OAuth state — restarting OAuth login flow");
    return res.redirect("/oauth/login");
  }

  // State is valid → remove it to prevent replay
  delete storage.oauthStates[state];

  try {
    console.log("🔐 Exchanging Uber code for token...");

    const tokenResponse = await axios.post(
      "https://auth.uber.com/oauth/v2/token",
      qs.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
        code,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, expires_in } = tokenResponse.data;
    const tokenKey = `token-${Date.now()}`;

    storage.userTokens[tokenKey] = {
      access_token,
      expires_in,
      obtained_at: Date.now(),
    };

    // ✅ Log token in Render dashboard (backend logs only)
    console.log(`✅ OAuth token stored for session ${tokenKey}`);
    console.log(`🔑 Latest OAuth token for testing: ${access_token}`);

    // Clean redirect — prevent ?code=... from sticking in browser bar
    res.redirect(`/?oauth_success=true`);
  } catch (err) {
    handleOAuthError(err, res);
  }
});

// --------------------
// Helper: get valid User Token for OAuth sessions
// --------------------
async function getValidToken(tokenKey, res) {
  const record = storage.userTokens[tokenKey];
  if (!record) throw new Error("No token stored for this session");

  const now = Date.now();
  const expiresAt = record.obtained_at + record.expires_in * 1000;

  // Token still valid
  if (now < expiresAt - 60 * 1000) return record.access_token;

  // Token expired → user must re-login
  console.log(`⚠️ User Token expired for session ${tokenKey}, redirecting to /login`);

  if (res) {
    return res.redirect("/oauth/login");
  }

  throw new Error("User Token expired. Merchant must re-login via /oauth/login.");
}

// --------------------
// Helper: get client credential token (for GET /pos_data)
// --------------------
async function getClientToken() {
  const now = Date.now();
  const record = storage.clientToken || {};

  // Reuse token if not expired
  if (record.access_token && now < record.expires_at - 60 * 1000) {
    console.log(`🔑 Reusing existing client credential token (expires in ${(record.expires_at - now)/1000}s)`);
    return record.access_token;
  }

  try {
    const res = await axios.post(
      "https://auth.uber.com/oauth/v2/token",
      qs.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "client_credentials",
        scope: "eats.store"  // ✅ Required scope
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, expires_in } = res.data;
    storage.clientToken = { access_token, expires_at: now + expires_in * 1000 };
    console.log(`🔑 Obtained new client credential token (expires in ${expires_in}s)`);
    return access_token;
  } catch (err) {
    console.error("❌ Client credential token error:", err.response?.data || err.message);
    throw err;
  }
}

// --------------------
// OAuth error handler
// --------------------
function handleOAuthError(err, res) {
  const status = err.response?.status;
  const uberError = err.response?.data?.error_description || err.response?.data?.error || JSON.stringify(err.response?.data);

  switch (status) {
    case 400: return res.status(400).send(`⚠️ Invalid request. Uber error: ${uberError}`);
    case 401: return res.status(401).send(`⚠️ Unauthorized / expired token. Uber error: ${uberError}`);
    case 403: console.log("🔁 Access denied: redirecting user to /oauth/login for consent"); return res.redirect("/oauth/login");
    case 429: return res.status(429).send(`⚠️ Rate limit exceeded. Uber error: ${uberError}`);
    case 500: return res.status(500).send(`⚠️ Uber server error. Uber error: ${uberError}`);
    default: return res.status(status || 500).send(`⚠️ Unexpected error. Uber error: ${uberError}`);
  }
}

router.getValidToken = getValidToken;
router.getClientToken = getClientToken;

module.exports = router;
