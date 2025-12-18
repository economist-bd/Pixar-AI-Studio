// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHFsTRQT1eopfz8NG5ux__0QKgKCnoXOE",
  authDomain: "support-94add.firebaseapp.com",
  projectId: "support-94add",
  storageBucket: "support-94add.firebasestorage.app",
  messagingSenderId: "442252148032",
  appId: "1:442252148032:web:0abf946c077aa8c8368ea5",
  measurementId: "G-VWBYECJHFN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };