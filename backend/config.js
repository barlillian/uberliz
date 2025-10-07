require("dotenv").config();

// Render sets RENDER=true automatically in deployed environment
const runningOnRender = process.env.RENDER === "true";

// Force local redirect if not on Render, even if NODE_ENV=prod
const isProd = runningOnRender;

module.exports = {
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  REDIRECT_URI: isProd
    ? process.env.REDIRECT_URI_PROD
    : process.env.REDIRECT_URI_LOCAL,
  UBER_API_BASE_URL: process.env.UBER_API_BASE_URL,
  PORT: process.env.PORT || 3000,
};
