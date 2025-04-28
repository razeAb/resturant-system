import React, { useState, useContext } from "react"; // ✅ fixed
import axios from "axios";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider, linkWithCredential } from "firebase/auth";
import { AuthContext } from "./AuthContext"; // ✅ Also make sure you import AuthContext

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { user, token } = useContext(AuthContext);

  const handleGoogleLogin = async () => {
    try {
      // 1. Sign in with Google
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const token = await user.getIdToken();

      // 2. Check if user already has a phone number
      if (!user.phoneNumber) {
        // 3. If not, start phone verification

        const phoneNumber = prompt("אנא הזן מספר טלפון כולל קידומת מדינה (למשל, +972...)");
        if (!phoneNumber) {
          setError("חובה להזין מספר טלפון כדי להשלים את ההתחברות.");
          return;
        }

        // Setup invisible Recaptcha
        window.recaptchaVerifier = new RecaptchaVerifier(
          "recaptcha-container",
          {
            size: "invisible",
            callback: (response) => {
              console.log("reCAPTCHA נפתר בהצלחה");
            },
          },
          auth
        );

        const appVerifier = window.recaptchaVerifier;

        // Send verification SMS
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);

        const verificationCode = prompt("אנא הזן את קוד האימות (6 ספרות) שנשלח אליך בהודעת SMS:");
        if (!verificationCode) {
          setError("חובה להזין קוד אימות.");
          return;
        }

        // Link the phone number to the Google account
        const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, verificationCode);
        await linkWithCredential(user, credential);

        console.log("✅ קישור בין חשבון גוגל למספר טלפון בוצע בהצלחה!");
      }

      // 4. Send user data to the backend
      const response = await axios.post(
        "/api/auth/firebase-login",
        {
          name: user.displayName,
          email: user.email,
          photo: user.photoURL,
          phone: user.phoneNumber, // Include phone number
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // 5. Save token and user in localStorage
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      // 6. Redirect based on user role
      navigate(response.data.user.isAdmin ? "/admin/dashboard" : "/");
    } catch (error) {
      console.error("❌ שגיאה בהתחברות עם גוגל:", error);
      setError(error.message || "התחברות עם גוגל נכשלה.");
    }
  };

  // ✅ Email/Password Login
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:5001/api/auth/login", {
        email,
        password,
      });

      const user = response.data.user;
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(user));

      // ✅ Redirect based on role
      navigate(user.isAdmin ? "/admin/dashboard" : "/");
    } catch (error) {
      setError(error.response?.data?.message || "Something went wrong");
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
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 border border-gray-300 rounded mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" className="bg-black text-white w-full py-2 rounded hover:bg-gray-800">
          Login
        </button>

        {/* Register Button */}
        <button type="button" onClick={() => navigate("/register")} className="text-sm text-blue-500 mt-4 hover:underline">
          Don't have an account? Register
        </button>

        {/* OR */}
        <div className="my-6 border-t border-gray-300 relative">
          <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white px-2 text-gray-500 text-sm">or sign in with</span>
        </div>

        {/* Google Button */}
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="bg-white border border-gray-300 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm hover:bg-gray-50"
          >
            <img src="/svg/google.svg" alt="Google" className="w-5 h-5" />
            <span className="text-sm text-gray-700">Google</span>
          </button>
        </div>
      </form>
      <div id="recaptcha-container"></div>
    </div>
  );
};

export default Login;
