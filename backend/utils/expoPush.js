const { Expo } = require("expo-server-sdk");

const expo = new Expo();

// Sends one push per token via Expo's push service; invalid/malformed tokens
// are silently dropped rather than rejecting the whole batch.
async function sendExpoPushNotifications(tokens, { title, body, data } = {}) {
  const validTokens = [...new Set(tokens || [])].filter((t) => Expo.isExpoPushToken(t));
  if (!validTokens.length) return [];

  const messages = validTokens.map((to) => ({
    to,
    title,
    body,
    data,
    sound: "default",
    priority: "high",
    channelId: "delivery-requests",
  }));

  const tickets = [];
  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      tickets.push(...(await expo.sendPushNotificationsAsync(chunk)));
    } catch (err) {
      console.error("❌ Expo push chunk failed:", err?.message || err);
    }
  }
  return tickets;
}

module.exports = { sendExpoPushNotifications };
