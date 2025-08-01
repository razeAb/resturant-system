// backend/utils/tranzilaAuth.js
const crypto = require("crypto");
const axios = require("axios");

function generateNonce(length = 80) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function sendTranzilaRequest(data, endpoint, method = "POST") {
  const appKey = process.env.TRANZILA_PUBLIC_KEY;
  const secretKey = process.env.TRANZILA_SECRET_KEY;

  const time = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
  const nonce = generateNonce();
  const hmac = crypto
    .createHmac("sha256", secretKey + time + nonce)
    .update(appKey)
    .digest("hex");

  const headers = {
    "X-tranzila-api-app-key": appKey,
    "X-tranzila-api-request-time": time,
    "X-tranzila-api-nonce": nonce,
    "X-tranzila-api-access-token": hmac,
  };

  try {
    let response;
    if (method.toUpperCase() === "GET") {
      response = await axios.get(endpoint, { params: data, headers });
    } else {
      response = await axios.post(endpoint, data, { headers });
    }
    return response.data;
  } catch (error) {
    console.error("🔴 Tranzila request failed:", error.response?.data || error.message);
    console.log("=== Tranzila Auth Headers ===");
    console.log(headers);
    console.log("=== Tranzila Payload ===");
    console.log(data);
    throw error;
  }
}

module.exports = { sendTranzilaRequest };
