import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";
import { Link as RouterLink } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // 🔐 Store user data
      localStorage.setItem("user", JSON.stringify(user));

      // ✅ Redirect based on role
      if (user.email === "admin@example.com") {
        navigate("/admin/dashboard");
      } else {
        navigate("/"); // Home page for regular users
      }
    } catch (error) {
      console.error("❌ Google Sign-In Error:", error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:5001/api/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      navigate("/admin/dashboard"); // Redirect after login
    } catch (error) {
      setError(error.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-full max-w-md text-center">
        {/* 🔥 Logo */}
        <RouterLink to="/">
          <img
            src="/photos/logo1.jpg" // ✅ Place your logo here
            alt="Logo"
            className="w-20 h-20 mx-auto mb-4"
          />
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

        {/* ✅ Register Button */}
        <button type="button" onClick={() => navigate("/register")} className="text-sm text-blue-500 mt-4 hover:underline">
          Don't have an account? Register
        </button>

        {/* ✅ OR separator */}
        <div className="my-6 border-t border-gray-300 relative">
          <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white px-2 text-gray-500 text-sm">or sign in with</span>
        </div>

        {/* ✅ Google & Apple Buttons (UI only) */}
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="bg-white border border-gray-300 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm hover:bg-gray-50"
          >
            <img src="/svg/google.svg" alt="Google" className="w-5 h-5" />
            <span className="text-sm text-gray-700">google</span>
          </button>

          {/* <button
            type="button"
            onClick={() => alert("Apple Sign-In not implemented yet")}
            className="bg-black text-white rounded-full px-4 py-2 flex items-center justify-center gap-2 hover:bg-gray-800 transition duration-200"
          >
            <img src="/svg/apple.svg" alt="Apple" className="w-5 h-5 invert" />
            <span className="text-sm font-medium">Apple</span>
          </button> */}
        </div>
      </form>
    </div>
  );
};

export default Login;
