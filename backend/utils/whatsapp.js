const axios = require("axios");

async function sendWhatsAppNotification(order) {
  const to = process.env.OWNER_PHONE;

  // simplest: send a TEMPLATE (recommended for reliability)
  // Create a template in Meta called: "new_order_alert"
  // with variables: {{1}} orderId, {{2}} total, {{3}} delivery
  return axios.post(
    `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: "new_order_alert",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: String(order._id) },
              { type: "text", text: String(order.totalPrice ?? order.total ?? "") },
              { type: "text", text: String(order.deliveryOption ?? order.deliveryType ?? "") },
            ],
          },
        ],
      },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    },
  );
}

module.exports = { sendWhatsAppNotification };
