const express = require("express");
const axios = require("axios");
const qs = require("querystring");
const crypto = require("crypto");
const router = express.Router();
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = require("./config");
const storage = require("./storage");

// Step 1: Redirect user to Uber OAuth
router.get("/login", (req, res) => {
  const state = crypto.randomBytes(8).toString("hex");
  storage.oauthState = state;

  const oauthUrl = `https://auth.uber.com/oauth/v2/authorize?` +
    `client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=eats.pos_provisioning` +
    `&state=${state}`;

  res.redirect(oauthUrl);
});

// Step 2: Uber redirects back with code → exchange for tokens
router.get("/redirect", async (req, res) => {
  const { code, error, state } = req.query;

  if (error) return res.status(403).send(`⚠️ Authorization failed: ${error}\n👉 Next action: Ask merchant to retry and grant permissions.`);
  if (!code) return res.status(400).send(`⚠️ Missing authorization code.\n👉 Next action: Ensure redirect_uri matches Uber dashboard and retry login.`);
  if (!state || state !== storage.oauthState) return res.status(400).send(`⚠️ Invalid state parameter.\n👉 Next action: Possible CSRF attack — restart login flow.`);

  try {
    const tokenResponse = await axios.post(
      "https://auth.uber.com/oauth/v2/token",
      qs.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
        code
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    storage.userTokens["demoMerchant"] = {
      access_token,
      refresh_token,
      expires_in,
      obtained_at: Date.now()
    };

    res.send("✅ OAuth successful! Token received. Ready for /api/stores.");
  } catch (err) {
    handleOAuthError(err, res);
  }
});

// Helper: auto-refresh token
async function getValidToken(merchantId = "demoMerchant") {
  const record = storage.userTokens[merchantId];
  if (!record) throw new Error("No tokens stored for merchant");

  const now = Date.now();
  const expiresAt = record.obtained_at + record.expires_in * 1000;
  if (now < expiresAt - 60 * 1000) return record.access_token;

  try {
    const refreshResponse = await axios.post(
      "https://auth.uber.com/oauth/v2/token",
      qs.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: record.refresh_token
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, refresh_token, expires_in } = refreshResponse.data;
    storage.userTokens[merchantId] = { access_token, refresh_token, expires_in, obtained_at: Date.now() };
    console.log("🔄 Token refreshed successfully");
    return access_token;
  } catch (err) {
    console.error("Token refresh error:", err.response?.data || err.message);
    throw new Error("Unable to refresh token. Merchant may need to re-login.");
  }
}

// Error handler
function handleOAuthError(err, res) {
  const status = err.response?.status;
  const uberError = err.response?.data?.error_description || err.response?.data?.error || JSON.stringify(err.response?.data);

  switch (status) {
    case 400: return res.status(400).send(`⚠️ Invalid request. Uber error: ${uberError}\n👉 Next action: Verify client_id, redirect_uri, and code parameters.`);
    case 401: return res.status(401).send(`⚠️ Unauthorized / expired token. Uber error: ${uberError}\n👉 Next action: Try refreshing the access_token using refresh_token.`);
    case 403: console.log("🔁 Access denied: redirecting user to /oauth/login for consent"); return res.redirect("/oauth/login");
    case 429: return res.status(429).send(`⚠️ Rate limit exceeded. Uber error: ${uberError}\n👉 Next action: Wait a few seconds and retry. Cache tokens until expiry.`);
    case 500: return res.status(500).send(`⚠️ Uber server error. Uber error: ${uberError}\n👉 Next action: Retry later or contact Uber support.`);
    default: return res.status(status || 500).send(`⚠️ Unexpected error. Uber error: ${uberError}\n👉 Next action: Retry login process or check app configuration.`);
  }
}

router.getValidToken = getValidToken;
module.exports = router;
