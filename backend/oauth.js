// backend/oauth.js

const express = require("express");
const axios = require("axios");
const qs = require("querystring");
const router = express.Router();
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = require("./config");
const storage = require("./storage");

// Step 1: Redirect user to Uber OAuth
router.get("/login", (req, res) => {
  const oauthUrl = `https://auth.uber.com/oauth/v2/authorize?` +
    `client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=eats.pos_provisioning`;

  res.redirect(oauthUrl);
});

// Step 2: OAuth callback from Uber
router.get("/callback", async (req, res) => {
  const { code } = req.query;

  // 400: Missing code
  if (!code) {
    return res.status(400).send(`
      ⚠️ Authorization code is missing.
      Possible reasons:
      - Merchant did not click "Allow / Consent" on Uber login page
      - Redirect URL misconfigured in Developer Dashboard
      👉 Next action: Ask merchant to click "Connect with Uber Eats" again.
    `);
  }

  try {
    // Exchange authorization code for access token (form-urlencoded per Uber docs)
    const tokenResponse = await axios.post(
      "https://auth.uber.com/oauth/v2/token",
      qs.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
        code: code
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Store tokens (for demo, under fixed merchant key; in production, tie to actual merchant ID)
    storage.userTokens["demoMerchant"] = {
      access_token,
      refresh_token,
      expires_in
    };

    res.send("✅ OAuth successful! Access token received. You can now fetch stores.");
  } catch (err) {
    console.error("OAuth error:", err.response?.data || err.message);

    const status = err.response?.status;
    const uberError = err.response?.data?.error_description || err.response?.data?.error;

    switch (status) {
      case 400:
        return res.status(400).send(`
          ⚠️ Invalid request while exchanging authorization code.
          Uber error: ${uberError || "Missing or invalid parameter"}
          👉 Next action: Check code, redirect_uri, client_id are correct.
        `);
      case 401:
        return res.status(401).send(`
          ⚠️ Unauthorized: Invalid client ID or client secret.
          Uber error: ${uberError || "invalid_client"}
          👉 Next action: Verify CLIENT_ID and CLIENT_SECRET in config.js.
        `);
      case 403:
        return res.status(403).send(`
          ⚠️ Access denied: Merchant did not grant consent.
          Uber error: ${uberError || "access_denied"}
          👉 Next action: Ask merchant to re-click "Connect with Uber Eats".
        `);
      case 429:
        return res.status(429).send(`
          ⚠️ Too many requests: Rate limit exceeded.
          👉 Next action: Retry after cooldown. Cache and reuse tokens until expiry.
        `);
      case 500:
        return res.status(500).send(`
          ⚠️ Uber server error while exchanging code for token.
          👉 Next action: Retry later, or contact Uber developer support.
        `);
      default:
        return res.status(500).send(`
          ⚠️ Unexpected error while exchanging authorization code.
          Uber error: ${uberError || "Unknown"}
          👉 Next action: Please retry login process.
        `);
    }
  }
});

module.exports = router;
