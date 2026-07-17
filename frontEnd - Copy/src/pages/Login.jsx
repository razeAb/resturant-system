import React, { useState, useContext } from "react";
import api from "../api";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { initializeFirebase } from "../firebase"; // ✅ חדש
import CartContext from "../context/CartContext";
import { UserPlus, KeyRound, BadgeCheck } from "lucide-react";
import { useLang } from "../context/LangContext";

const Login = () => {
  const navigate = useNavigate();
  const { clearCart } = useContext(CartContext);
  const { t, dir } = useLang();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // quick client-side validation for clearer feedback before hitting the server
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(`/api/auth/login`, { email, password });
      const user = response.data.user;

      clearCart();
      localStorage.removeItem("cartItems");
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(user));

      navigate(user.isAdmin ? "/admin/dashboard" : "/");
    } catch (error) {
      console.error("Login Error:", error.response || error.message || error);
      setError(error.response?.data?.message || "משהו השתבש בהתחברות");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { auth, googleProvider } = await initializeFirebase(); // ✅ שורה חדשה
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const token = await user.getIdToken();

      await sendUserToBackend(user, token);
    } catch (error) {
      console.error("❌ שגיאה בהתחברות עם גוגל:", error);
      setError(error.message || "התחברות עם גוגל נכשלה.");
    } finally {
      setLoading(false);
    }
  };

  const sendUserToBackend = async (user, token) => {
    const response = await api.post(
      `/api/auth/firebase-login`,
      {
        name: user.displayName,
        email: user.email,
        photo: user.photoURL,
        phone: user.phoneNumber,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    localStorage.setItem("token", response.data.token);
    localStorage.setItem("user", JSON.stringify(response.data.user));
    navigate(response.data.user.isAdmin ? "/admin/dashboard" : "/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4" dir={dir}>
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-full max-w-md text-center">
        <RouterLink to="/">
          <img src="/photos/logo1.jpg" alt="Logo" className="w-20 h-20 mx-auto mb-4" />
        </RouterLink>

        <h2 className="text-2xl font-semibold mb-6">{t("login.title", "Login")}</h2>

        {error && (
          <p className="text-red-500 mb-4 text-sm" role="alert" aria-live="assertive">
            {error}
          </p>
        )}

        <input
          type="email"
          placeholder={t("login.email", "Email")}
          className="w-full p-2 border border-gray-300 rounded mb-4"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError("");
          }}
          required
          autoComplete="email"
        />

        <div className="w-full mb-4 relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder={t("login.password", "Password")}
            className="w-full p-2 pr-24 border border-gray-300 rounded"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute inset-y-0 right-0 px-3 text-sm text-gray-600 hover:text-gray-800"
            tabIndex={-1}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <button
          type="submit"
          className={`bg-black text-white w-full py-2 rounded hover:bg-gray-800 ${loading ? "opacity-80 cursor-not-allowed" : ""}`}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? t("login.processing", "Processing...") : t("login.submit", "Login")}
        </button>

        <div className="mt-4 grid gap-2 text-left">
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-md border border-orange-200 bg-orange-50 text-orange-800 text-sm font-medium hover:bg-orange-100 transition"
          >
            <span className="inline-flex items-center gap-2">
              <UserPlus size={16} /> {t("login.createAccount", "Create an account")}
            </span>
            <span className="text-xs">→</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/resetPassword")}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-md border border-gray-200 bg-gray-50 text-gray-700 text-sm font-medium hover:bg-gray-100 transition"
          >
            <span className="inline-flex items-center gap-2">
              <KeyRound size={16} /> {t("login.forgotPassword", "Forgot password?")}
            </span>
            <span className="text-xs">→</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/worker/login")}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-800 text-sm font-medium hover:bg-indigo-100 transition"
          >
            <span className="inline-flex items-center gap-2">
              <BadgeCheck size={16} /> {t("login.workerLogin", "Worker login")}
            </span>
            <span className="text-xs">→</span>
          </button>
        </div>

        <div className="my-6 border-t border-gray-300 relative">
          <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white px-2 text-gray-500 text-sm">{t("login.or", "or")}</span>
        </div>

        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="bg-white border border-gray-300 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm hover:bg-gray-50"
            disabled={loading}
          >
            <img src="/svg/google.svg" alt="Google" className="w-5 h-5" />
            <span className="text-sm text-gray-700">{t("login.signInWithGoogle", "Sign in with Google")}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;
