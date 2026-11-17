import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function verify() {
  await signInWithEmailAndPassword(auth, "demo@attendly.com", "AttendlyDemo2026!");
  
  const [rolesSnap, profilesSnap, assignSnap, classesSnap, batchesSnap] = await Promise.all([
    getDocs(collection(db, "user_roles")),
    getDocs(collection(db, "profiles")),
    getDocs(collection(db, "teacher_assignments")),
    getDocs(collection(db, "classes")),
    getDocs(collection(db, "batches")),
  ]);

  const roles = rolesSnap.docs.map(d => d.data());
  const profiles = profilesSnap.docs.map(d => d.data());
  const assign = assignSnap.docs.map(d => d.data());
  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const batches = batchesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const teachers = roles.filter((r) => r.role === "teacher").map((r) => {
    const p = profiles.find((x) => x.id === r.user_id);
    const cls = assign.filter((a) => a.teacher_id === r.user_id).map((a) => classes.find((c) => c.id === a.class_id)?.name).filter(Boolean);
    return {
      name: p?.full_name || p?.email || "—",
      email: p?.email || "—",
      classes: cls,
      assignmentCount: cls.length
    };
  });

  console.log("=== TEACHERS PAGE VIEW ===");
  console.log(JSON.stringify(teachers, null, 2));

  console.log("\n=== CLASSES PAGE VIEW ===");
  classes.forEach(c => {
    const classAssignments = assign.filter(a => a.class_id === c.id);
    const assignedTeachers = classAssignments.map(a => {
      const t = profiles.find(p => p.id === a.teacher_id);
      const b = batches.find(x => x.id === a.batch_id);
      return `${t?.full_name || "Unknown"} (${b ? b.name : "All batches"})`;
    });
    console.log(`Class: ${c.name} | Assigned Teachers: [${assignedTeachers.join(", ")}]`);
  });

  process.exit(0);
}
verify();
