import React, { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

const WorkerLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const normalizeWorker = (raw, fallbackName = "") => ({
    name:   raw?.name || raw?.fullName || fallbackName || "",
    role:   raw?.role || raw?.position || "",
    avatar: raw?.avatar || raw?.image || "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/api/workers/login", { username, password });
      const token   = data?.token;
      const worker  = data?.worker;

      if (token) localStorage.setItem("workerToken", token);

      if (worker) {
        localStorage.setItem("worker", JSON.stringify(normalizeWorker(worker, username)));
      } else {
        // fallback: אם השרת לא החזיר worker בלוגין, נביא את הפרופיל
        try {
          const me = await api.get("/api/workers/me");
          localStorage.setItem("worker", JSON.stringify(normalizeWorker(me.data, username)));
        } catch {
          // לא נכשלים על זה; שם יופיע מאוחר יותר כשיהיה
          localStorage.setItem("worker", JSON.stringify(normalizeWorker({}, username)));
        }
      }

      navigate("/worker/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || "התחברות נכשלה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4" dir="rtl">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-extrabold mb-6 text-center">התחברות עובד</h2>

        {error && (
          <p className="text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 text-sm mb-4">
            {error}
          </p>
        )}

        <label className="block text-sm text-gray-700 mb-1">שם משתמש</label>
        <input
          type="text"
          placeholder="name@example.com"
          className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-gray-800/20"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />

        <label className="block text-sm text-gray-700 mb-1">סיסמה</label>
        <input
          type="password"
          placeholder="••••••••"
          className="w-full p-3 border border-gray-300 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-gray-800/20"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white w-full py-3 rounded-lg hover:bg-gray-800 transition disabled:opacity-60"
        >
          {loading ? "מתחבר..." : "התחבר"}
        </button>
      </form>
    </div>
  );
};

export default WorkerLogin;
