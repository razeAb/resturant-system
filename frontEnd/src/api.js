// src/api.js
import axios from "axios";

// בוחרים בסיס כתובת פעם אחת, עם fallback ללוקאלי
const BASE_URL = (import.meta.env.VITE_API_URL?.trim?.() || import.meta.env.VITE_API_BASE_URL?.trim?.() || "http://localhost:5001").replace(
  /\/$/,
  ""
); // הסרת '/' בסוף כדי למנוע '//' כפול

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false, // אם עובדים עם קבצי cookie בצד שרת, שנה ל-true והגדר CORS מתאים
});

// ----- Request interceptor: מוסיף Authorization -----
api.interceptors.request.use((config) => {
  // Support both worker/admin storage keys to avoid missing headers -> 401
  const token = localStorage.getItem("workerToken") || localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ----- Response interceptor: לא מפנה אוטומטית -----
// We simply bubble up 401/403 so the page can decide (toast/refresh/etc.).

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (!error.response) return Promise.reject(error);
    return Promise.reject(error);
  }
);

export default api;
export { api };
