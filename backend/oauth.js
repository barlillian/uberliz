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
  storage.oauthStates[state] = true; // per-session state

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

  if (error) return res.status(403).send(`⚠️ Authorization failed: ${error}`);
  if (!code) return res.status(400).send(`⚠️ Missing authorization code.`);
  if (!state || !storage.oauthStates[state]) return res.status(400).send(`⚠️ Invalid state parameter.`);
  delete storage.oauthStates[state]; // consume state

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
    const tokenKey = `token-${Date.now()}`;

    storage.userTokens[tokenKey] = { access_token, refresh_token, expires_in, obtained_at: Date.now() };

    // ✅ Redirect user to index.html with short success flag
    res.redirect(`/?oauth_success=true`);
  } catch (err) {
    handleOAuthError(err, res);
  }
});

// --------------------
// Helper: get valid token
// --------------------
async function getValidToken(tokenKey) {
  const record = storage.userTokens[tokenKey];
  if (!record) throw new Error("No token stored for this session");

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
    storage.userTokens[tokenKey] = { access_token, refresh_token, expires_in, obtained_at: Date.now() };
    console.log("🔄 Token refreshed successfully for session", tokenKey);
    return access_token;
  } catch (err) {
    console.error("Token refresh error:", err.response?.data || err.message);
    throw new Error("Unable to refresh token. Merchant may need to re-login.");
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

module.exports = router;
