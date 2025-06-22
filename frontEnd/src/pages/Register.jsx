import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider } from "../firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationStep, setVerificationStep] = useState("registration"); // "registration", "verification"
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(""); // Clear error when user types
  };

  // Function to initialize RecaptchaVerifier on demand when needed
  const setupRecaptcha = () => {
    // Always create a new instance when needed and don't store it globally
    try {
      // Clear any existing recaptcha first
      const recaptchaContainer = document.getElementById("recaptcha-container");
      while (recaptchaContainer.firstChild) {
        recaptchaContainer.removeChild(recaptchaContainer.firstChild);
      }

      // Create new invisible RecaptchaVerifier
      const recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: (response) => {
          console.log("reCAPTCHA verified successfully");
        },
        "expired-callback": () => {
          console.log("reCAPTCHA expired");
          setError("Security verification expired. Please try again.");
        },
      });

      // Render the reCAPTCHA widget
      return recaptchaVerifier.render();
    } catch (error) {
      console.error("Error setting up reCAPTCHA:", error);
      setError(`Error setting up security verification: ${error.message}`);
      return null;
    }
  };

  const sendVerificationCode = async () => {
    if (!formData.phone) {
      setError("Please enter a phone number");
      return;
    }

    setLoading(true);

    try {
      // Set up recaptcha on demand
      const recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {
          console.log("reCAPTCHA verified");
        },
      });

      await recaptchaVerifier.render(); // Make sure to render it

      // Format the phone number for Israel
      const formattedPhone = `+972${formData.phone.replace(/^0/, "")}`;
      console.log("Sending code to:", formattedPhone);

      // Send the verification code
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      setConfirmationResult(confirmation);
      setVerificationStep("verification");
      setSuccess(`Verification code sent to ${formattedPhone}`);
      setError("");
    } catch (error) {
      console.error("Verification code error:", error);
      setError(`Failed to send verification code: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const verifyCodeAndRegister = async () => {
    if (!verificationCode) {
      setError("Please enter the verification code");
      return;
    }

    setLoading(true);
    try {
      // Confirm the verification code
      if (!confirmationResult) {
        throw new Error("Verification session expired. Please try again.");
      }

      await confirmationResult.confirm(verificationCode);

      // After phone verification succeeds, register the user
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/register`, {
        ...formData,
        phoneVerified: true,
      });

      setSuccess("Registration successful! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      console.error("Registration error:", error);
      if (error.code === "auth/invalid-verification-code") {
        setError("Invalid verification code. Please try again.");
      } else {
        setError(error.response?.data?.message || `Registration failed: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Form validation
    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
      setError("All fields are required");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    // Password validation (at least 8 characters)
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    // Phone validation (Israeli format)
    const phoneRegex = /^0?\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError("Please enter a valid Israeli phone number");
      return;
    }

    // Send verification code
    await sendVerificationCode();
  };

  // Try a simpler registration flow without phone verification for troubleshooting
  const handleSimpleRegistration = async (e) => {
    e.preventDefault();

    // Form validation
    if (!formData.name || !formData.email || !formData.password) {
      setError("Name, email and password are required");
      return;
    }

    setLoading(true);
    try {
      // Register without phone verification for testing
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/register`, {
        ...formData,
        phoneVerified: false, // Skip phone verification for now
      });

      setSuccess("Registration successful! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      console.error("Registration error:", error);
      setError(error.response?.data?.message || `Registration failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md text-center">
        <img src="/photos/logo1.jpg" alt="Logo" className="w-20 h-20 mx-auto mb-4" />

        {verificationStep === "registration" ? (
          <>
            <h2 className="text-2xl font-semibold mb-6">Register</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            {success && <p className="text-green-500 mb-4">{success}</p>}

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded mb-4"
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded mb-4"
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded mb-4"
                required
              />
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number (e.g., 0501234567)"
                value={formData.phone}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded mb-4"
                required
              />

              {/* This div is where reCAPTCHA will be rendered */}
              <div id="recaptcha-container" className="mb-4"></div>

              <button
                type="submit"
                className="bg-black text-white w-full py-2 rounded hover:bg-gray-800 disabled:bg-gray-400"
                disabled={loading}
              >
                {loading ? "Processing..." : "Register"}
              </button>

              {/* Temporary fallback button for testing */}
              <button
                type="button"
                onClick={handleSimpleRegistration}
                className="mt-4 bg-gray-100 text-gray-700 w-full py-2 rounded hover:bg-gray-200 disabled:bg-gray-400"
                disabled={loading}
              >
                Register without Phone Verification
              </button>
            </form>

            <button type="button" onClick={() => navigate("/login")} className="text-sm text-blue-500 mt-4 hover:underline">
              Already have an account? Login
            </button>
          </>
        ) : (
          // Phone verification step
          <div className="text-left">
            <h2 className="text-2xl font-semibold mb-6 text-center">Verify Your Phone</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            {success && <p className="text-green-500 mb-4">{success}</p>}

            <p className="mb-4">We've sent a verification code to your phone. Please enter it below:</p>

            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mb-4"
            />

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setVerificationStep("registration");
                }}
                className="flex-1 py-2 px-4 border border-gray-300 rounded hover:bg-gray-100"
                disabled={loading}
              >
                Back
              </button>
              <button
                onClick={verifyCodeAndRegister}
                className="flex-1 bg-black text-white py-2 px-4 rounded hover:bg-gray-800 disabled:bg-gray-400"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Complete Registration"}
              </button>
            </div>

            <button
              type="button"
              onClick={sendVerificationCode}
              className="text-sm text-blue-500 mt-4 hover:underline w-full text-center disabled:text-gray-400"
              disabled={loading}
            >
              Didn't receive a code? Send again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
