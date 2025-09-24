require("dotenv").config();

const ENV = process.env.NODE_ENV || "local";

module.exports = {
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  REDIRECT_URI:
    ENV === "prod"
      ? process.env.REDIRECT_URI_PROD
      : process.env.REDIRECT_URI_LOCAL,
  UBER_API_BASE_URL: process.env.UBER_API_BASE_URL,
  PORT: process.env.PORT || 3000,
};
