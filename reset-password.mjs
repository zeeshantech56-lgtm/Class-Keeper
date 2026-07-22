import { initializeApp } from "firebase/app";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCoFVsVQKR1TW1cAGaxjLJmNete5r-w74k",
  authDomain: "class-keeper-81eae.firebaseapp.com",
  projectId: "class-keeper-81eae",
  storageBucket: "class-keeper-81eae.firebasestorage.app",
  messagingSenderId: "102191700217",
  appId: "1:102191700217:web:a625541dfc85f0aa9cea28"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function run() {
  try {
    await sendPasswordResetEmail(auth, "zeeshantech56@gmail.com");
    console.log("Password reset email sent successfully.");
  } catch (e) {
    console.error("Error sending reset email:", e);
  }
  process.exit(0);
}
run();
