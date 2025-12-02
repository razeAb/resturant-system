const axios = require("axios");

async function sendWhatsAppNotification(order) {
  try {
    const body =
      `📦 *New Order Received!*\n\n` +
      `Order ID: ${order._id}\n` +
      `Customer: ${order.customerName || "Guest"}\n` +
      `Phone: ${order.phone}\n` +
      `Delivery: ${order.deliveryOption}\n` +
      `Payment: ${order.paymentDetails?.method}\n` +
      `Total: ₪${order.totalPrice}\n\n` +
      `🛒 *Items:*\n` +
      order.items.map((i) => `• ${i.title} x${i.quantity}`).join("\n");

    await axios.post(
      `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: process.env.OWNER_PHONE,
        type: "template",
        text: { body },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("📩 WhatsApp notification sent!");
  } catch (err) {
    console.error("❌ WhatsApp Error:", err.response?.data || err.message);
  }
}

module.exports = { sendWhatsAppNotification };
