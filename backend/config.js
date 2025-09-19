// backend/config.js
require("dotenv").config();

module.exports = {
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  REDIRECT_URI: process.env.REDIRECT_URI,
  UBER_API_BASE_URL: process.env.UBER_API_BASE_URL,
  PORT: process.env.PORT || 3000,
};