// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// IMPORTANT: Replace these with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyAruMGRYCGvW6sD6K-GfFa_x7f0W-bBoqU",
  authDomain: "connectsphere-553f2.firebaseapp.com",
  projectId: "connectsphere-553f2",
  storageBucket: "connectsphere-553f2.firebasestorage.app",
  messagingSenderId: "721782401193",
  appId: "1:721782401193:web:368c51bdea26c457e7a1b8",
  measurementId: "G-X4QQSPK95Y"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
