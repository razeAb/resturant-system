import client from "./client";

export const loginDriver = (username, password) => client.post("/api/drivers/login", { username, password }).then((r) => r.data);

export const fetchMe = () => client.get("/api/drivers/me").then((r) => r.data);

export const setOnline = (online) => client.post("/api/drivers/online", { online }).then((r) => r.data);

export const registerPushToken = (token) => client.post("/api/drivers/push-token", { token }).then((r) => r.data);

export const fetchAvailableOrders = () => client.get("/api/drivers/orders/available").then((r) => r.data);

export const claimOrder = (orderId) => client.post(`/api/drivers/orders/${orderId}/claim`).then((r) => r.data);

export const fetchMyOrders = () => client.get("/api/drivers/orders/mine").then((r) => r.data);

export const markPickedUp = (orderId) => client.post(`/api/drivers/orders/${orderId}/picked-up`).then((r) => r.data);

export const markDelivered = (orderId, cashCollected) =>
  client.post(`/api/drivers/orders/${orderId}/delivered`, { cashCollected }).then((r) => r.data);
