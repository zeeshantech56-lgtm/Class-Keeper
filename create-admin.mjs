import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, addDoc, collection, query, where, getDocs } from "firebase/firestore";

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
const db = getFirestore(app);

async function run() {
  const email = "zeeshantech56@gmail.com";
  const password = "123456";
  const fullName = "Zeeshan Raza";
  let uid;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    uid = cred.user.uid;
    console.log("Created new user:", uid);
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      console.log("User already exists, signing in...");
      const cred = await signInWithEmailAndPassword(auth, email, password);
      uid = cred.user.uid;
    } else {
      console.error("Auth error:", e);
      process.exit(1);
    }
  }

  // Set profile
  await setDoc(doc(db, "profiles", uid), {
    id: uid,
    full_name: fullName,
  }, { merge: true });
  console.log("Profile set.");

  // Check role
  const q = query(collection(db, "user_roles"), where("user_id", "==", uid), where("role", "==", "admin"));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, "user_roles"), {
      user_id: uid,
      role: "admin"
    });
    console.log("Admin role assigned successfully.");
  } else {
    console.log("User is already an admin.");
  }
  process.exit(0);
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
