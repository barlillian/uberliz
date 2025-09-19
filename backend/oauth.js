// backend/oauth.js

const express = require("express");
const axios = require("axios");
const router = express.Router();
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = require("./config");
const storage = require("./storage");

// Step 1: Redirect user to Uber OAuth
router.get("/login", (req, res) => {
  const oauthUrl = `https://login.uber.com/oauth/v2/authorize?` +
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
      - Merchant did not click "Allow" / consent on Uber login.
      - The redirect URL is misconfigured in the app settings.
      Action: Please asks merchant to re-click "Connect with Uber Eats" again.
    `);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post("https://login.uber.com/oauth/v2/token", null, {
      params: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
        code: code
      }
    });

    const accessToken = tokenResponse.data.access_token;

    // For demo, store token under a generic key
    storage.userTokens["demoMerchant"] = accessToken;

    res.send("✅ OAuth successful! Access token received. You can now fetch stores.");
  } catch (err) {
    console.error(err.response?.data || err.message);

    // Include Uber response if available
    const uberError = err.response?.data?.error_description || err.response?.data?.error;

    res.status(500).send(`
      ⚠️ Failed to exchange authorization code for access token.
      ${uberError ? "Uber error: " + uberError : ""}
      Possible reasons:
      - Invalid client ID or client secret
      - Expired or already used authorization code
      - Network / server issue
      Action: Please retry the login process.
    `);
  }
});

module.exports = router;