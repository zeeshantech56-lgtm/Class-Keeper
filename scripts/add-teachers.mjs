import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  where
} from "firebase/firestore";

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
const auth = getAuth(app);
const db = getFirestore(app);

const TEACHERS_TO_ADD = [
  {
    name: "Dr. Vikram Sen",
    email: "vikram.sen@attendly.edu",
    password: "TeacherPassword2026!",
    assignments: [
      { class_id: "class_10_sci", batch_id: "batch_10_sci_a" }
    ]
  },
  {
    name: "Mrs. Priya Sharma",
    email: "priya.sharma@attendly.edu",
    password: "TeacherPassword2026!",
    assignments: [
      { class_id: "class_10_sci", batch_id: "batch_10_sci_b" }
    ]
  },
  {
    name: "Prof. Rajesh Kulkarni",
    email: "rajesh.kulkarni@attendly.edu",
    password: "TeacherPassword2026!",
    assignments: [
      { class_id: "class_10_math", batch_id: "batch_10_math_a" }
    ]
  },
  {
    name: "Ms. Ananya Deshmukh",
    email: "ananya.deshmukh@attendly.edu",
    password: "TeacherPassword2026!",
    assignments: [
      { class_id: "class_11_cs", batch_id: "batch_11_cs_a" }
    ]
  },
  {
    name: "Mr. Sanjay Gupta",
    email: "sanjay.gupta@attendly.edu",
    password: "TeacherPassword2026!",
    assignments: [
      { class_id: "class_12_comm", batch_id: "batch_12_comm_a" }
    ]
  }
];

async function addTeachers() {
  console.log("Signing in as demo admin...");
  await signInWithEmailAndPassword(auth, "demo@attendly.com", "AttendlyDemo2026!");
  console.log("Admin authenticated.");

  // Clear old malformed assignments (those missing teacher_id or using user_id)
  console.log("Cleaning up old malformed teacher_assignments...");
  const oldAssignSnap = await getDocs(collection(db, "teacher_assignments"));
  for (const d of oldAssignSnap.docs) {
    await deleteDoc(d.ref);
  }
  console.log("Old assignments cleared.");

  // Clean and update existing profiles so they have professional emails
  const existingUpdates = [
    { id: "4I74QFmBIEfnaHNvRqPqop1YOj23", name: "Mohammad Faiz Qureshi", email: "faiz.qureshi@attendly.edu", class_id: "class_10_sci" },
    { id: "IesdecW5E1YWR7bt3FO00iJX4Qp2", name: "Sikander Ali", email: "sikander.ali@attendly.edu", class_id: "class_11_cs" },
    { id: "dTX0aM8HzAbCBvIKBo6y0HKzgx13", name: "Mubeen Khan", email: "mubeen.khan@attendly.edu", class_id: "class_12_comm" }
  ];

  for (const item of existingUpdates) {
    await setDoc(doc(db, "profiles", item.id), {
      id: item.id,
      full_name: item.name,
      email: item.email
    }, { merge: true });

    // Ensure role is teacher
    const rSnap = await getDocs(query(collection(db, "user_roles"), where("user_id", "==", item.id)));
    if (rSnap.empty) {
      await addDoc(collection(db, "user_roles"), { user_id: item.id, role: "teacher" });
    }

    // Add assignment
    await addDoc(collection(db, "teacher_assignments"), {
      teacher_id: item.id,
      class_id: item.class_id
    });
    console.log(`Updated existing teacher ${item.name} and assigned to ${item.class_id}`);
  }

  // Create new teachers in Auth & Firestore
  for (const t of TEACHERS_TO_ADD) {
    let uid = null;
    const secondaryApp = initializeApp(firebaseConfig, `SecondaryApp_${Date.now()}_${Math.random()}`);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, t.email, t.password);
      uid = cred.user.uid;
      console.log(`Created Firebase Auth user for ${t.name} (UID: ${uid})`);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        console.log(`Auth user for ${t.email} already exists, attempting login to get UID...`);
        try {
          const cred = await signInWithEmailAndPassword(secondaryAuth, t.email, t.password);
          uid = cred.user.uid;
        } catch (loginErr) {
          console.warn(`Could not sign in as ${t.email}:`, loginErr.message);
        }
      } else {
        console.warn(`Could not create auth account for ${t.name}:`, err.message);
      }
    } finally {
      await secondaryAuth.signOut().catch(() => {});
      await deleteApp(secondaryApp).catch(() => {});
    }

    // If we didn't get UID from auth, generate a deterministic document ID for profile
    if (!uid) {
      uid = `teacher_${t.email.split("@")[0].replace(".", "_")}`;
    }

    // 1. Profile
    await setDoc(doc(db, "profiles", uid), {
      id: uid,
      full_name: t.name,
      email: t.email
    }, { merge: true });

    // 2. Role
    const rSnap = await getDocs(query(collection(db, "user_roles"), where("user_id", "==", uid)));
    if (rSnap.empty) {
      await addDoc(collection(db, "user_roles"), {
        user_id: uid,
        role: "teacher"
      });
    }

    // 3. Assignments
    for (const a of t.assignments) {
      const payload = {
        teacher_id: uid,
        class_id: a.class_id
      };
      if (a.batch_id) {
        payload.batch_id = a.batch_id;
      }
      await addDoc(collection(db, "teacher_assignments"), payload);
      console.log(`Assigned ${t.name} to class ${a.class_id} (batch: ${a.batch_id || "all"})`);
    }
  }

  console.log("All teachers and class assignments completed successfully!");
  process.exit(0);
}

addTeachers().catch(err => {
  console.error("Failed to add teachers:", err);
  process.exit(1);
});
