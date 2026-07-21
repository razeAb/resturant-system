import client from "./client";

// Reuses the existing web-admin login (User model, isAdmin/isPlatformAdmin) - the driver
// app's "Admin Mode" is a separate identity from a Driver account, not a driver flag.
export const loginAdmin = (email, password) => client.post("/api/auth/login", { email, password }).then((r) => r.data);

export const loginWithGoogleIdToken = (idToken) => client.post("/api/auth/google-login", { idToken }).then((r) => r.data);

export const fetchDashboard = () => client.get("/api/admin-mode/dashboard").then((r) => r.data);

export const fetchDeliveries = (filter = "active") =>
  client.get("/api/admin-mode/deliveries", { params: { filter } }).then((r) => r.data);

export const fetchDeliveryDetail = (id) => client.get(`/api/admin-mode/deliveries/${id}`).then((r) => r.data);

export const assignDriverToDelivery = (id, driverId) =>
  client.post(`/api/admin-mode/deliveries/${id}/assign`, { driverId }).then((r) => r.data);

export const unassignDriver = (id) => client.post(`/api/admin-mode/deliveries/${id}/unassign`).then((r) => r.data);

export const cancelDelivery = (id) => client.post(`/api/admin-mode/deliveries/${id}/cancel`).then((r) => r.data);

export const setDeliveryStatus = (id, status) => client.put(`/api/admin-mode/deliveries/${id}/status`, { status }).then((r) => r.data);

export const fetchAllDrivers = () => client.get("/api/drivers").then((r) => r.data);

export const createDriverAdmin = (driver) => client.post("/api/drivers", driver).then((r) => r.data);

export const updateDriverAdmin = (id, updates) => client.put(`/api/drivers/${id}`, updates).then((r) => r.data);

export const forceDriverOffline = (id) => client.post(`/api/drivers/${id}/force-offline`).then((r) => r.data);

export const resetDriverPassword = (id, newPassword) =>
  client.post(`/api/drivers/${id}/reset-password`, { newPassword }).then((r) => r.data);

export const updateDriverZonesAdmin = (id, zones) => client.put(`/api/drivers/${id}/zones`, { zones }).then((r) => r.data);

export const searchSettlementsAdmin = (q) =>
  client.get("/api/admin-mode/search-settlements", { params: { q } }).then((r) => r.data.results);

export const fetchSettlementBoundaryAdmin = (lat, lng) =>
  client.get("/api/admin-mode/settlement-boundary", { params: { lat, lng } }).then((r) => r.data);

export const fetchPayments = (params) => client.get("/api/admin-mode/payments", { params }).then((r) => r.data);

export const markPaymentPaid = (orderId) => client.post(`/api/admin-mode/payments/${orderId}/mark-paid`).then((r) => r.data);
