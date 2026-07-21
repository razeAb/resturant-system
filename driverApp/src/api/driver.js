import client from "./client";

export const loginDriver = (username, password) => client.post("/api/drivers/login", { username, password }).then((r) => r.data);

export const fetchMe = () => client.get("/api/drivers/me").then((r) => r.data);

export const setOnline = (online) => client.post("/api/drivers/online", { online }).then((r) => r.data);

export const registerPushToken = (token) => client.post("/api/drivers/push-token", { token }).then((r) => r.data);

export const fetchRestaurant = () => client.get("/api/restaurant").then((r) => r.data);

export const updateMyZones = (zones) => client.put("/api/drivers/zones", { zones }).then((r) => r.data);

export const searchSettlements = (q) =>
  client.get("/api/drivers/search-settlements", { params: { q } }).then((r) => r.data.results);

export const fetchSettlementBoundary = (lat, lng) =>
  client.get("/api/drivers/settlement-boundary", { params: { lat, lng } }).then((r) => r.data);

export const fetchAvailableOrders = () => client.get("/api/drivers/orders/available").then((r) => r.data);

export const claimOrder = (orderId) => client.post(`/api/drivers/orders/${orderId}/claim`).then((r) => r.data);

export const declineOrder = (orderId) => client.post(`/api/drivers/orders/${orderId}/decline`).then((r) => r.data);

export const fetchMyOrders = () => client.get("/api/drivers/orders/mine").then((r) => r.data);

export const markArrived = (orderId) => client.post(`/api/drivers/orders/${orderId}/arrived`).then((r) => r.data);

export const markPickedUp = (orderId) => client.post(`/api/drivers/orders/${orderId}/picked-up`).then((r) => r.data);

export const markDelivered = (orderId, cashCollected) =>
  client.post(`/api/drivers/orders/${orderId}/delivered`, { cashCollected }).then((r) => r.data);

export const markCustomerUnavailable = (orderId, note) =>
  client.post(`/api/drivers/orders/${orderId}/customer-unavailable`, { note }).then((r) => r.data);

export const fetchEarnings = () => client.get("/api/drivers/orders/earnings").then((r) => r.data);

export const updateMyProfile = (updates) => client.put("/api/drivers/me", updates).then((r) => r.data);
