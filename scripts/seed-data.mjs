import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  writeBatch,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { format, subDays, getDay, parseISO } from "date-fns";

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

async function seed() {
  console.log("Authenticating demo admin...");
  const cred = await signInWithEmailAndPassword(auth, "demo@attendly.com", "AttendlyDemo2026!");
  const uid = cred.user.uid;
  console.log("Authenticated as:", uid);

  // 1. Settings
  console.log("Setting app settings...");
  const settingsSnap = await getDocs(query(collection(db, "app_settings"), where("key", "==", "at_risk_threshold")));
  if (settingsSnap.empty) {
    await setDoc(doc(collection(db, "app_settings")), { key: "at_risk_threshold", value: 75 });
  }

  // 2. Classes
  console.log("Setting up classes...");
  const classDefs = [
    { id: "class_10_sci", name: "Grade 10 - Science", created_by: uid },
    { id: "class_10_math", name: "Grade 10 - Mathematics", created_by: uid },
    { id: "class_11_cs", name: "Grade 11 - Computer Science", created_by: uid },
    { id: "class_12_comm", name: "Grade 12 - Commerce", created_by: uid },
  ];

  for (const c of classDefs) {
    await setDoc(doc(db, "classes", c.id), { name: c.name, created_by: c.created_by }, { merge: true });
  }

  // 3. Batches
  console.log("Setting up batches...");
  const batchDefs = [
    { id: "batch_10_sci_a", name: "Section A (Morning)", class_id: "class_10_sci", created_by: uid },
    { id: "batch_10_sci_b", name: "Section B (Afternoon)", class_id: "class_10_sci", created_by: uid },
    { id: "batch_10_math_a", name: "Batch Alpha", class_id: "class_10_math", created_by: uid },
    { id: "batch_11_cs_a", name: "Batch Tech-1", class_id: "class_11_cs", created_by: uid },
    { id: "batch_12_comm_a", name: "Batch Finance", class_id: "class_12_comm", created_by: uid },
  ];

  for (const b of batchDefs) {
    await setDoc(doc(db, "batches", b.id), {
      name: b.name,
      class_id: b.class_id,
      created_by: b.created_by
    }, { merge: true });
  }

  // 4. Students
  console.log("Setting up students...");
  const studentDefs = [
    // Grade 10 - Science (Section A)
    { id: "std_101", name: "Aarav Sharma", roll_no: "101", class_id: "class_10_sci", batch_id: "batch_10_sci_a", email: "aarav.sharma@attendly.edu", phone: "+91 98201 11223", parent_name: "Rajesh Sharma", parent_phone: "+91 98201 11224", parent_email: "rajesh.sharma@gmail.com", atRisk: false },
    { id: "std_102", name: "Ananya Verma", roll_no: "102", class_id: "class_10_sci", batch_id: "batch_10_sci_a", email: "ananya.v@attendly.edu", phone: "+91 98201 11225", parent_name: "Sunita Verma", parent_phone: "+91 98201 11226", parent_email: "sunita.v@gmail.com", atRisk: false },
    { id: "std_103", name: "Rohan Mehta", roll_no: "103", class_id: "class_10_sci", batch_id: "batch_10_sci_a", email: "rohan.m@attendly.edu", phone: "+91 98201 11227", parent_name: "Sanjay Mehta", parent_phone: "+91 98201 11228", parent_email: "sanjay.m@gmail.com", atRisk: false },
    { id: "std_104", name: "Priya Patel", roll_no: "104", class_id: "class_10_sci", batch_id: "batch_10_sci_a", email: "priya.p@attendly.edu", phone: "+91 98201 11229", parent_name: "Dinesh Patel", parent_phone: "+91 98201 11230", parent_email: "dinesh.p@gmail.com", atRisk: false },
    { id: "std_105", name: "Kabir Khan", roll_no: "105", class_id: "class_10_sci", batch_id: "batch_10_sci_a", email: "kabir.k@attendly.edu", phone: "+91 98201 11231", parent_name: "Tariq Khan", parent_phone: "+91 98201 11232", parent_email: "tariq.k@gmail.com", atRisk: true }, // At risk!
    { id: "std_106", name: "Sneha Reddy", roll_no: "106", class_id: "class_10_sci", batch_id: "batch_10_sci_a", email: "sneha.r@attendly.edu", phone: "+91 98201 11233", parent_name: "Venkat Reddy", parent_phone: "+91 98201 11234", parent_email: "venkat.r@gmail.com", atRisk: false },

    // Grade 10 - Science (Section B)
    { id: "std_107", name: "Dev Malhotra", roll_no: "107", class_id: "class_10_sci", batch_id: "batch_10_sci_b", email: "dev.m@attendly.edu", phone: "+91 98201 11235", parent_name: "Ashok Malhotra", parent_phone: "+91 98201 11236", parent_email: "ashok.m@gmail.com", atRisk: false },
    { id: "std_108", name: "Ishaan Gupta", roll_no: "108", class_id: "class_10_sci", batch_id: "batch_10_sci_b", email: "ishaan.g@attendly.edu", phone: "+91 98201 11237", parent_name: "Manoj Gupta", parent_phone: "+91 98201 11238", parent_email: "manoj.g@gmail.com", atRisk: false },
    { id: "std_109", name: "Tanvi Joshi", roll_no: "109", class_id: "class_10_sci", batch_id: "batch_10_sci_b", email: "tanvi.j@attendly.edu", phone: "+91 98201 11239", parent_name: "Anand Joshi", parent_phone: "+91 98201 11240", parent_email: "anand.j@gmail.com", atRisk: false },
    { id: "std_110", name: "Aryan Singh", roll_no: "110", class_id: "class_10_sci", batch_id: "batch_10_sci_b", email: "aryan.s@attendly.edu", phone: "+91 98201 11241", parent_name: "Vikram Singh", parent_phone: "+91 98201 11242", parent_email: "vikram.s@gmail.com", atRisk: false },

    // Grade 10 - Mathematics
    { id: "std_201", name: "Meera Nair", roll_no: "201", class_id: "class_10_math", batch_id: "batch_10_math_a", email: "meera.n@attendly.edu", phone: "+91 98201 11243", parent_name: "Suresh Nair", parent_phone: "+91 98201 11244", parent_email: "suresh.n@gmail.com", atRisk: false },
    { id: "std_202", name: "Rahul Deshmukh", roll_no: "202", class_id: "class_10_math", batch_id: "batch_10_math_a", email: "rahul.d@attendly.edu", phone: "+91 98201 11245", parent_name: "Nitin Deshmukh", parent_phone: "+91 98201 11246", parent_email: "nitin.d@gmail.com", atRisk: false },
    { id: "std_203", name: "Fatima Sheikh", roll_no: "203", class_id: "class_10_math", batch_id: "batch_10_math_a", email: "fatima.s@attendly.edu", phone: "+91 98201 11247", parent_name: "Imran Sheikh", parent_phone: "+91 98201 11248", parent_email: "imran.s@gmail.com", atRisk: false },
    { id: "std_204", name: "Vikram Rathore", roll_no: "204", class_id: "class_10_math", batch_id: "batch_10_math_a", email: "vikram.r@attendly.edu", phone: "+91 98201 11249", parent_name: "Mahendra Rathore", parent_phone: "+91 98201 11250", parent_email: "mahendra.r@gmail.com", atRisk: false },
    { id: "std_205", name: "Yash Chawla", roll_no: "205", class_id: "class_10_math", batch_id: "batch_10_math_a", email: "yash.c@attendly.edu", phone: "+91 98201 11251", parent_name: "Deepak Chawla", parent_phone: "+91 98201 11252", parent_email: "deepak.c@gmail.com", atRisk: true }, // At risk!

    // Grade 11 - Computer Science
    { id: "std_301", name: "Siddharth Rao", roll_no: "301", class_id: "class_11_cs", batch_id: "batch_11_cs_a", email: "siddharth.r@attendly.edu", phone: "+91 98201 11253", parent_name: "Krishna Rao", parent_phone: "+91 98201 11254", parent_email: "krishna.r@gmail.com", atRisk: false },
    { id: "std_302", name: "Pooja Iyer", roll_no: "302", class_id: "class_11_cs", batch_id: "batch_11_cs_a", email: "pooja.i@attendly.edu", phone: "+91 98201 11255", parent_name: "Raman Iyer", parent_phone: "+91 98201 11256", parent_email: "raman.i@gmail.com", atRisk: false },
    { id: "std_303", name: "Aditya Kulkarni", roll_no: "303", class_id: "class_11_cs", batch_id: "batch_11_cs_a", email: "aditya.k@attendly.edu", phone: "+91 98201 11257", parent_name: "Milind Kulkarni", parent_phone: "+91 98201 11258", parent_email: "milind.k@gmail.com", atRisk: false },
    { id: "std_304", name: "Divya Nair", roll_no: "304", class_id: "class_11_cs", batch_id: "batch_11_cs_a", email: "divya.n@attendly.edu", phone: "+91 98201 11259", parent_name: "Balan Nair", parent_phone: "+91 98201 11260", parent_email: "balan.n@gmail.com", atRisk: false },

    // Grade 12 - Commerce
    { id: "std_401", name: "Riya Sen", roll_no: "401", class_id: "class_12_comm", batch_id: "batch_12_comm_a", email: "riya.s@attendly.edu", phone: "+91 98201 11261", parent_name: "Subhash Sen", parent_phone: "+91 98201 11262", parent_email: "subhash.s@gmail.com", atRisk: false },
    { id: "std_402", name: "Kunal Kapoor", roll_no: "402", class_id: "class_12_comm", batch_id: "batch_12_comm_a", email: "kunal.k@attendly.edu", phone: "+91 98201 11263", parent_name: "Anil Kapoor", parent_phone: "+91 98201 11264", parent_email: "anil.k@gmail.com", atRisk: false },
    { id: "std_403", name: "Neha Saxena", roll_no: "403", class_id: "class_12_comm", batch_id: "batch_12_comm_a", email: "neha.s@attendly.edu", phone: "+91 98201 11265", parent_name: "Rajiv Saxena", parent_phone: "+91 98201 11266", parent_email: "rajiv.s@gmail.com", atRisk: false },
    { id: "std_404", name: "Alok Pandey", roll_no: "404", class_id: "class_12_comm", batch_id: "batch_12_comm_a", email: "alok.p@attendly.edu", phone: "+91 98201 11267", parent_name: "Hemant Pandey", parent_phone: "+91 98201 11268", parent_email: "hemant.p@gmail.com", atRisk: false },
  ];

  for (const s of studentDefs) {
    const { atRisk, ...data } = s;
    await setDoc(doc(db, "students", s.id), data, { merge: true });
  }

  // 5. Teacher assignments
  console.log("Setting up teacher assignments...");
  const profilesSnap = await getDocs(collection(db, "profiles"));
  const profiles = profilesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  if (profiles.length > 0) {
    const tAssignments = [
      { teacher_id: profiles[0].id, class_id: "class_10_sci", batch_id: "batch_10_sci_a" },
      { teacher_id: profiles[0].id, class_id: "class_10_math", batch_id: "batch_10_math_a" },
      { teacher_id: profiles[1]?.id || profiles[0].id, class_id: "class_11_cs", batch_id: "batch_11_cs_a" },
      { teacher_id: profiles[2]?.id || profiles[0].id, class_id: "class_12_comm", batch_id: "batch_12_comm_a" },
    ];
    for (const a of tAssignments) {
      await setDoc(doc(db, "teacher_assignments", `${a.teacher_id}_${a.class_id}`), a, { merge: true });
    }
  }

  // 6. Attendance records for past 30 days (up to today: 2026-11-17)
  console.log("Generating 30-day realistic attendance records...");
  const today = new Date();
  const days = [];
  for (let i = 29; i >= 0; i--) {
    days.push(subDays(today, i));
  }

  // We write in batches of up to 450 (Firestore limit is 500)
  let currentBatch = writeBatch(db);
  let opCount = 0;
  let totalRecords = 0;

  for (const day of days) {
    const dayOfWeek = getDay(day);
    // Skip Sundays (0)
    if (dayOfWeek === 0) continue;

    const dateStr = format(day, "yyyy-MM-dd");
    const isToday = (dateStr === format(today, "yyyy-MM-dd"));

    for (const s of studentDefs) {
      // If it's today, leave class_12_comm unmarked so dashboard shows 'classes with no attendance today'
      if (isToday && s.class_id === "class_12_comm") {
        continue;
      }

      // Determine attendance status
      let isPresent = true;
      if (s.atRisk) {
        // At-risk student has ~62% attendance
        // More likely absent on Mondays (1) and Fridays (5)
        const absentChance = (dayOfWeek === 1 || dayOfWeek === 5) ? 0.45 : 0.35;
        isPresent = Math.random() > absentChance;
      } else {
        // Regular student has ~93% attendance
        // Occasional random absence (e.g. 7%)
        isPresent = Math.random() > 0.07;
      }

      const status = isPresent ? "present" : "absent";
      const docId = `${s.id}_${dateStr}`;
      const record = {
        id: docId,
        student_id: s.id,
        class_id: s.class_id,
        batch_id: s.batch_id || null,
        date: dateStr,
        status: status,
        marked_by: uid,
        created_at: day.toISOString()
      };

      currentBatch.set(doc(db, "attendance", docId), record, { merge: true });
      opCount++;
      totalRecords++;

      if (opCount >= 400) {
        await currentBatch.commit();
        console.log(`Committed batch of ${opCount} attendance records (Total: ${totalRecords})...`);
        currentBatch = writeBatch(db);
        opCount = 0;
      }
    }
  }

  if (opCount > 0) {
    await currentBatch.commit();
    console.log(`Committed final batch of ${opCount} attendance records (Total: ${totalRecords})...`);
  }

  console.log("Seeding complete! Successfully added realistic data across classes, batches, students, and attendance.");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
