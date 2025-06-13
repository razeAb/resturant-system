import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
} from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDGtHPJMVCgSw2QIwMMsorusykzlZqCseE",
  authDomain: "hungeryresturant.firebaseapp.com",
  projectId: "hungeryresturant",
  storageBucket: "hungeryresturant.firebasestorage.app",
  messagingSenderId: "734373548495",
  appId: "1:734373548495:web:c75a7d4be37bb522a842ba",
  measurementId: "G-JLMHGN69HK",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
const auth = getAuth(app);

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Optionally disable reCAPTCHA for testing (for development only, remove for production)
auth.settings.appVerificationDisabledForTesting = true;

// 📞 Helper function to format phone numbers to +972
const formatPhoneNumber = (number) => {
  if (number.startsWith("0")) {
    return "+972" + number.substring(1);
  }
  return number;
};

// Create reCAPTCHA verifier (only for phone authentication)
const createRecaptchaVerifier = (elementId) => {
  return new RecaptchaVerifier(
    elementId,
    {
      size: "invisible",
      callback: (response) => {
        console.log("reCAPTCHA solved successfully");
      },
    },
    auth
  );
};

// Function to handle Google sign-in
const handleGoogleSignIn = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log("Google user:", user);
  } catch (error) {
    console.error("Error signing in with Google:", error);
  }
};

// Function to handle password reset
const handlePasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log("Password reset email sent to", email);
  } catch (error) {
    console.error("Error sending password reset email:", error);
  }
};

// Function to send verification code via SMS
const sendVerificationCode = async (phoneNumber, recaptchaElementId) => {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Create reCAPTCHA instance
    const recaptchaVerifier = createRecaptchaVerifier(recaptchaElementId);

    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
    console.log("Verification code sent!");
    return confirmationResult; // To use later for verification
  } catch (error) {
    console.error("Error sending verification code:", error);
  }
};

// Function to verify the entered code
const verifyCode = async (confirmationResult, verificationCode) => {
  try {
    const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, verificationCode);
    await auth.signInWithCredential(credential);
    console.log("Phone number verified successfully!");
  } catch (error) {
    console.error("Error verifying phone number:", error);
  }
};

export { auth, googleProvider, sendPasswordResetEmail, sendVerificationCode, verifyCode, handleGoogleSignIn, handlePasswordReset };
