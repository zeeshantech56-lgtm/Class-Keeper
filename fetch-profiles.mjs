import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCoFVsVQKR1TW1cAGaxjLJmNete5r-w74k",
  authDomain: "class-keeper-81eae.firebaseapp.com",
  projectId: "class-keeper-81eae",
  storageBucket: "class-keeper-81eae.firebasestorage.app",
  messagingSenderId: "102191700217",
  appId: "1:102191700217:web:a625541dfc85f0aa9cea28"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snap = await getDocs(collection(db, "profiles"));
  const profiles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log("PROFILES:");
  console.log(JSON.stringify(profiles, null, 2));
  process.exit(0);
}
run();
