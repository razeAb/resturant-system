// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDGtHPJMVCgSw2QIwMMsorusykzlZqCseE",
  authDomain: "hungeryresturant.firebaseapp.com",
  projectId: "hungeryresturant",
  storageBucket: "hungeryresturant.firebasestorage.app",
  messagingSenderId: "734373548495",
  appId: "1:734373548495:web:c75a7d4be37bb522a842ba",
  measurementId: "G-JLMHGN69HK",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
