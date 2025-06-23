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

// ✅ Firebase config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ✅ Dev-only: Disable reCAPTCHA for testing
if (import.meta.env.DEV) {
  auth.settings.appVerificationDisabledForTesting = true;
}

// 📞 Format phone number to +972
const formatPhoneNumber = (number) => {
  if (number.startsWith("0")) {
    return "+972" + number.substring(1);
  }
  return number;
};

// ✅ reCAPTCHA verifier
const createRecaptchaVerifier = (elementId) => {
  return new RecaptchaVerifier(
    elementId,
    {
      size: "invisible",
      callback: () => console.log("✅ reCAPTCHA solved"),
    },
    auth
  );
};

// ✅ Google sign-in
const handleGoogleSignIn = async () => {
  try {
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

// ✅ Password reset
const handlePasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log("📧 Password reset email sent to", email);
  } catch (error) {
    console.error("❌ Failed to send reset email:", error.code, error.message);
    throw error;
  }
};

// ✅ Send SMS verification code
const sendVerificationCode = async (phoneNumber, recaptchaElementId) => {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const recaptchaVerifier = createRecaptchaVerifier(recaptchaElementId);

    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
    console.log("📲 Verification code sent to", formattedPhone);
    return confirmationResult;
  } catch (error) {
    console.error("❌ Failed to send verification code:", error.code, error.message);
    throw error;
  }
};

// ✅ Verify entered code
const verifyCode = async (confirmationResult, verificationCode) => {
  try {
    const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, verificationCode);
    const result = await signInWithCredential(auth, credential);
    console.log("✅ Phone number verified!", result.user);
    return result.user;
  } catch (error) {
    console.error("❌ Failed to verify code:", error.code, error.message);
    throw error;
  }
};

export {
  auth,
  googleProvider,
  handleGoogleSignIn,
  handlePasswordReset,
  sendVerificationCode,
  verifyCode,
};
