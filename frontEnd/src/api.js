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
  const token = localStorage.getItem("workerToken"); // ← הגדרה חסרה אצלך
  if (token) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ----- Response interceptor: מפנה ללוגין על 401/403 -----
let isRedirecting = false;

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const path = typeof window !== "undefined" ? window.location.pathname : "";

    if (!error.response) {
      // בעיית רשת — לא מפנים אוטומטית
      return Promise.reject(error);
    }

    if ((status === 401 || status === 403) && path !== "/worker/login") {
      localStorage.removeItem("workerToken");
      localStorage.removeItem("worker");
      if (typeof window !== "undefined" && !isRedirecting) {
        isRedirecting = true;
        window.location.replace("/worker/login"); // replace כדי לא להוסיף להיסטוריה
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { api };
