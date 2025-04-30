import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider, linkWithCredential } from "firebase/auth";
import { AuthContext } from "../context/AuthContext";

// 📞 Format phone number to international format
const formatPhoneNumber = (number) => {
  if (number.startsWith("0")) {
    return "+972" + number.substring(1);
  }
  return number;
};

const Login = () => {
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [googleUser, setGoogleUser] = useState(null);
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ Set up RecaptchaVerifier when modal opens
  useEffect(() => {
    if (showPhoneModal && !window.recaptchaVerifier) {
      try {
        const authInstance = auth; // already imported correctly from firebase.js

        window.recaptchaVerifier = new RecaptchaVerifier(
          authInstance, // ✅ FIRST param must be auth
          "recaptcha-container", // ✅ SECOND param is container id
          {
            size: "invisible",
            callback: (response) => {
              console.log("✅ reCAPTCHA solved successfully");
            },
          }
        );

        setRecaptchaReady(true);
      } catch (error) {
        console.error("❌ Recaptcha creation error:", error);
        setError("בעיה ביצירת אימות אנושי. נסה לרענן את הדף.");
      }
    }
  }, [showPhoneModal]);

  // ✅ Email and password login
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post("http://localhost:5001/api/auth/login", { email, password });

      const user = response.data.user;
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(user));

      navigate(user.isAdmin ? "/admin/dashboard" : "/");
    } catch (error) {
      setError(error.response?.data?.message || "משהו השתבש בהתחברות");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Google login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const token = await user.getIdToken();

      if (!user.phoneNumber) {
        setGoogleUser(user);
        setShowPhoneModal(true);
        return;
      }

      await sendUserToBackend(user, token);
    } catch (error) {
      console.error("❌ שגיאה בהתחברות עם גוגל:", error);
      setError(error.message || "התחברות עם גוגל נכשלה.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Send user data to backend
  const sendUserToBackend = async (user, token) => {
    const response = await axios.post(
      "/api/auth/firebase-login",
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

  // ✅ Send verification SMS
  const sendVerificationCode = async () => {
    try {
      if (!recaptchaReady) {
        setError("המערכת לא מוכנה לשלוח קוד עדיין.");
        return;
      }

      setLoading(true);

      const formattedPhone = formatPhoneNumber(phoneNumber);
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);

      setConfirmationResult(confirmation);
      console.log("✅ Verification code sent!");
    } catch (error) {
      console.error("❌ שגיאה בשליחת קוד:", error);
      setError(error.message || "שליחת קוד נכשלה");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Confirm verification code
  const verifyCodeAndLink = async () => {
    try {
      setLoading(true);

      const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, verificationCode);
      await linkWithCredential(googleUser, credential);

      console.log("✅ Phone linked successfully!");

      const token = await googleUser.getIdToken();
      await sendUserToBackend(googleUser, token);

      setShowPhoneModal(false);
    } catch (error) {
      console.error("❌ שגיאה באימות קוד:", error);
      setError(error.message || "אימות קוד נכשל");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-full max-w-md text-center">
        {/* 🔥 Logo */}
        <RouterLink to="/">
          <img src="/photos/logo1.jpg" alt="Logo" className="w-20 h-20 mx-auto mb-4" />
        </RouterLink>

        <h2 className="text-2xl font-semibold mb-6">Login</h2>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 border border-gray-300 rounded mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 border border-gray-300 rounded mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" className="bg-black text-white w-full py-2 rounded hover:bg-gray-800" disabled={loading}>
          {loading ? "Processing..." : "Login"}
        </button>

        {/* Register */}
        <button type="button" onClick={() => navigate("/register")} className="text-sm text-blue-500 mt-4 hover:underline">
          Don't have an account? Register
        </button>
        <br></br>
        {/* Forgot Password link */}
        <button type="button" onClick={() => navigate("/resetPassword")} className="text-sm text-blue-500 mt-4 hover:underline">
          Forgot Password?
        </button>
        {/* Divider */}
        <div className="my-6 border-t border-gray-300 relative">
          <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white px-2 text-gray-500 text-sm">or</span>
        </div>

        {/* Google Sign-In Button */}
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="bg-white border border-gray-300 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm hover:bg-gray-50"
            disabled={loading}
          >
            <img src="/svg/google.svg" alt="Google" className="w-5 h-5" />
            <span className="text-sm text-gray-700">Sign in with Google</span>
          </button>
        </div>
      </form>

      {/* 🔥 Invisible Recaptcha */}
      <div id="recaptcha-container"></div>

      {/* 📱 Phone Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm">
            {!confirmationResult ? (
              <>
                <h2 className="text-xl font-semibold mb-4">הזן מספר טלפון</h2>
                <input
                  type="text"
                  placeholder="למשל 0521234567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded mb-4"
                />
                <button
                  className="bg-black text-white w-full py-2 rounded hover:bg-gray-800"
                  onClick={sendVerificationCode}
                  disabled={loading}
                >
                  {loading ? "שולח..." : "שלח קוד אימות"}
                </button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-4">הזן קוד אימות</h2>
                <input
                  type="text"
                  placeholder="קוד בן 6 ספרות"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded mb-4"
                />
                <button
                  className="bg-black text-white w-full py-2 rounded hover:bg-gray-800"
                  onClick={verifyCodeAndLink}
                  disabled={loading}
                >
                  {loading ? "מאמת..." : "אשר והמשך"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
