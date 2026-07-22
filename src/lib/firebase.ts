import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCoFVsVQKR1TW1cAGaxjLJmNete5r-w74k",
  authDomain: "class-keeper-81eae.firebaseapp.com",
  projectId: "class-keeper-81eae",
  storageBucket: "class-keeper-81eae.firebasestorage.app",
  messagingSenderId: "102191700217",
  appId: "1:102191700217:web:a625541dfc85f0aa9cea28",
  measurementId: "G-5QBLB1SEVZ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize analytics only if supported (e.g. in browser)
let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

export { analytics };
