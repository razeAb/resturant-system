import axios from "axios";

// Same env var convention as frontEnd/src/api.js (EXPO_PUBLIC_ prefix is
// required for Expo to inline it into the bundle at build time).
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL?.trim?.() || "http://localhost:5001").replace(/\/$/, "");

// Without a timeout, an unreachable backend (e.g. the dev machine's LAN IP changed) makes
// every request - including login - hang forever instead of failing with a clear error.
const client = axios.create({ baseURL: BASE_URL, timeout: 15000 });

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

client.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export default client;
