import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import axios from "axios";

// 🔄 Firebase instance refs
let firebaseApp = null;
let auth = null;
let googleProvider = null;

/**
 * ✅ Lazy-load Firebase config from backend & initialize
 */
const initializeFirebase = async () => {
  if (!firebaseApp) {
    const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/config/firebase`);
    const config = res.data;

    firebaseApp = initializeApp(config);
    auth = getAuth(firebaseApp);
    googleProvider = new GoogleAuthProvider();

    // ✅ Disable reCAPTCHA in development
    if (import.meta.env.DEV) {
      auth.settings.appVerificationDisabledForTesting = true;
    }
  }

  return { auth, googleProvider };
};

/**
 * 📞 Format phone number to +972
 */
const formatPhoneNumber = (number) => {
  if (number.startsWith("0")) return "+972" + number.substring(1);
  return number;
};

/**
 * 🧠 Create invisible reCAPTCHA verifier
 */
const createRecaptchaVerifier = async (elementId) => {
  const { auth } = await initializeFirebase();
  return new RecaptchaVerifier(
    elementId,
    {
      size: "invisible",
      callback: () => console.log("✅ reCAPTCHA solved"),
    },
    auth
  );
};

/**
 * 🔐 Google Sign-In
 */
const handleGoogleSignIn = async () => {
  try {
    const { auth, googleProvider } = await initializeFirebase();
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const token = await user.getIdToken();

    console.log("✅ Google user:", user);
    console.log("🔑 ID Token:", token);

    return user;
  } catch (error) {
    console.error("❌ Google login failed:", error.code, error.message);
    throw error;
  }
};

/**
 * 📧 Send password reset email
 */
const handlePasswordReset = async (email) => {
  try {
    const { auth } = await initializeFirebase();
    await sendPasswordResetEmail(auth, email);
    console.log("📧 Password reset email sent to", email);
  } catch (error) {
    console.error("❌ Failed to send reset email:", error.code, error.message);
    throw error;
  }
};

/**
 * 📲 Send SMS verification code
 */
const sendVerificationCode = async (phoneNumber, recaptchaElementId) => {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const { auth } = await initializeFirebase();
    const recaptchaVerifier = await createRecaptchaVerifier(recaptchaElementId);

    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
    console.log("📲 Verification code sent to", formattedPhone);
    return confirmationResult;
  } catch (error) {
    console.error("❌ Failed to send verification code:", error.code, error.message);
    throw error;
  }
};

/**
 * ✅ Verify SMS code
 */
const verifyCode = async (confirmationResult, verificationCode) => {
  try {
    const { auth } = await initializeFirebase();
    const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, verificationCode);
    const result = await signInWithCredential(auth, credential);
    console.log("✅ Phone number verified!", result.user);
    return result.user;
  } catch (error) {
    console.error("❌ Failed to verify code:", error.code, error.message);
    throw error;
  }
};

// ✅ Export everything
export { initializeFirebase, handleGoogleSignIn, handlePasswordReset, sendVerificationCode, verifyCode };
