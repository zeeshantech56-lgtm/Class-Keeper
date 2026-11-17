import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  writeBatch,
  getDocs,
  deleteDoc,
  query,
  where
} from "firebase/firestore";
import { format, subDays, getDay } from "date-fns";

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

// Complete Class 1 to 12 definition
const CLASSES_CONFIG = [
  { id: "cls_1", name: "Class 1", batches: [{ id: "b_1_a", name: "Section A" }, { id: "b_1_b", name: "Section B" }] },
  { id: "cls_2", name: "Class 2", batches: [{ id: "b_2_a", name: "Section A" }] },
  { id: "cls_3", name: "Class 3", batches: [{ id: "b_3_a", name: "Section A" }] },
  { id: "cls_4", name: "Class 4", batches: [{ id: "b_4_a", name: "Section A" }] },
  { id: "cls_5", name: "Class 5", batches: [{ id: "b_5_a", name: "Section A" }, { id: "b_5_b", name: "Section B" }] },
  { id: "cls_6", name: "Class 6", batches: [{ id: "b_6_a", name: "Section A" }, { id: "b_6_b", name: "Section B" }] },
  { id: "cls_7", name: "Class 7", batches: [{ id: "b_7_a", name: "Section A" }] },
  { id: "cls_8", name: "Class 8", batches: [{ id: "b_8_a", name: "Section A" }] },
  { id: "cls_9", name: "Class 9", batches: [{ id: "b_9_a", name: "Section A" }, { id: "b_9_b", name: "Section B" }] },
  { id: "cls_10", name: "Class 10", batches: [{ id: "b_10_a", name: "Section A" }, { id: "b_10_b", name: "Section B" }] },
  { id: "cls_11_sci", name: "Class 11 - Science", batches: [{ id: "b_11_sci", name: "Science Batch" }] },
  { id: "cls_11_comm", name: "Class 11 - Commerce", batches: [{ id: "b_11_comm", name: "Commerce Batch" }] },
  { id: "cls_12_sci", name: "Class 12 - Science", batches: [{ id: "b_12_sci", name: "Science Batch" }] },
  { id: "cls_12_comm", name: "Class 12 - Commerce", batches: [{ id: "b_12_comm", name: "Commerce Batch" }] },
];

// Dedicated teachers for different subjects/classes
const TEACHERS_CONFIG = [
  { id: "t_anita", name: "Mrs. Anita Rao", email: "anita.rao@attendly.edu", class_id: "cls_1", batch_id: "b_1_a" },
  { id: "t_kavita", name: "Mrs. Kavita Nair", email: "kavita.nair@attendly.edu", class_id: "cls_2", batch_id: "b_2_a" },
  { id: "t_sunita", name: "Mrs. Sunita Kapoor", email: "sunita.kapoor@attendly.edu", class_id: "cls_3", batch_id: "b_3_a" },
  { id: "t_pooja", name: "Ms. Pooja Hegde", email: "pooja.hegde@attendly.edu", class_id: "cls_4", batch_id: "b_4_a" },
  { id: "t_deepak", name: "Mr. Deepak Joshi", email: "deepak.joshi@attendly.edu", class_id: "cls_5", batch_id: "b_5_a" },
  { id: "t_alok", name: "Mr. Alok Mishra", email: "alok.mishra@attendly.edu", class_id: "cls_6", batch_id: "b_6_a" },
  { id: "t_neha", name: "Mrs. Neha Sinha", email: "neha.sinha@attendly.edu", class_id: "cls_7", batch_id: "b_7_a" },
  { id: "t_amit", name: "Mr. Amit Trivedi", email: "amit.trivedi@attendly.edu", class_id: "cls_8", batch_id: "b_8_a" },
  { id: "t_rajesh", name: "Prof. Rajesh Kulkarni", email: "rajesh.kulkarni@attendly.edu", class_id: "cls_9", batch_id: "b_9_a" },
  { id: "t_vikram", name: "Dr. Vikram Sen", email: "vikram.sen@attendly.edu", class_id: "cls_10", batch_id: "b_10_a" },
  { id: "t_priya", name: "Mrs. Priya Sharma", email: "priya.sharma@attendly.edu", class_id: "cls_11_sci", batch_id: "b_11_sci" },
  { id: "t_sanjay", name: "Mr. Sanjay Gupta", email: "sanjay.gupta@attendly.edu", class_id: "cls_11_comm", batch_id: "b_11_comm" },
  { id: "t_ananya", name: "Ms. Ananya Deshmukh", email: "ananya.deshmukh@attendly.edu", class_id: "cls_12_sci", batch_id: "b_12_sci" },
  { id: "t_faiz", name: "Mr. Mohammad Faiz Qureshi", email: "faiz.qureshi@attendly.edu", class_id: "cls_12_comm", batch_id: "b_12_comm" },
];

// Student templates per class (4 to 5 students per class = 60+ students)
const STUDENT_NAMES = [
  // Class 1
  { cls: "cls_1", b: "b_1_a", roll: "101", name: "Aarav Gupta", parent: "Mahesh Gupta", atRisk: false },
  { cls: "cls_1", b: "b_1_a", roll: "102", name: "Isha Malhotra", parent: "Rakesh Malhotra", atRisk: false },
  { cls: "cls_1", b: "b_1_b", roll: "103", name: "Vihaan Sharma", parent: "Alok Sharma", atRisk: false },
  { cls: "cls_1", b: "b_1_b", roll: "104", name: "Anvi Patel", parent: "Chetan Patel", atRisk: false },

  // Class 2
  { cls: "cls_2", b: "b_2_a", roll: "201", name: "Reyansh Mehta", parent: "Bhavin Mehta", atRisk: false },
  { cls: "cls_2", b: "b_2_a", roll: "202", name: "Myra Kapoor", parent: "Varun Kapoor", atRisk: false },
  { cls: "cls_2", b: "b_2_a", roll: "203", name: "Vivaan Deshmukh", parent: "Kiran Deshmukh", atRisk: true },
  { cls: "cls_2", b: "b_2_a", roll: "204", name: "Kiara Reddy", parent: "Srinivas Reddy", atRisk: false },

  // Class 3
  { cls: "cls_3", b: "b_3_a", roll: "301", name: "Advait Joshi", parent: "Ganesh Joshi", atRisk: false },
  { cls: "cls_3", b: "b_3_a", roll: "302", name: "Saanvi Iyer", parent: "Venkat Iyer", atRisk: false },
  { cls: "cls_3", b: "b_3_a", roll: "303", name: "Shaurya Singh", parent: "Devendra Singh", atRisk: false },
  { cls: "cls_3", b: "b_3_a", roll: "304", name: "Aadhya Nair", parent: "Mohan Nair", atRisk: false },

  // Class 4
  { cls: "cls_4", b: "b_4_a", roll: "401", name: "Dhruv Chawla", parent: "Pankaj Chawla", atRisk: false },
  { cls: "cls_4", b: "b_4_a", roll: "402", name: "Prisha Sen", parent: "Abhijit Sen", atRisk: false },
  { cls: "cls_4", b: "b_4_a", roll: "403", name: "Atharv Rao", parent: "Raghav Rao", atRisk: false },
  { cls: "cls_4", b: "b_4_a", roll: "404", name: "Navya Kulkarni", parent: "Shyam Kulkarni", atRisk: false },

  // Class 5
  { cls: "cls_5", b: "b_5_a", roll: "501", name: "Kabir Verma", parent: "Suresh Verma", atRisk: false },
  { cls: "cls_5", b: "b_5_a", roll: "502", name: "Diya Bhatia", parent: "Sunil Bhatia", atRisk: false },
  { cls: "cls_5", b: "b_5_b", roll: "503", name: "Ayaan Siddiqui", parent: "Tariq Siddiqui", atRisk: false },
  { cls: "cls_5", b: "b_5_b", roll: "504", name: "Tara Roy", parent: "Pradeep Roy", atRisk: false },

  // Class 6
  { cls: "cls_6", b: "b_6_a", roll: "601", name: "Aryan Pandey", parent: "Dharmendra Pandey", atRisk: false },
  { cls: "cls_6", b: "b_6_a", roll: "602", name: "Riya Trivedi", parent: "Sanjay Trivedi", atRisk: false },
  { cls: "cls_6", b: "b_6_b", roll: "603", name: "Arjun Saxena", parent: "Vipul Saxena", atRisk: false },
  { cls: "cls_6", b: "b_6_b", roll: "604", name: "Avani Mishra", parent: "Ashutosh Mishra", atRisk: false },

  // Class 7
  { cls: "cls_7", b: "b_7_a", roll: "701", name: "Devansh Nambiar", parent: "Gopal Nambiar", atRisk: false },
  { cls: "cls_7", b: "b_7_a", roll: "702", name: "Kavya Pillai", parent: "Madhavan Pillai", atRisk: false },
  { cls: "cls_7", b: "b_7_a", roll: "703", name: "Rudra Somani", parent: "Mukesh Somani", atRisk: true },
  { cls: "cls_7", b: "b_7_a", roll: "704", name: "Ananya Dixit", parent: "Naveen Dixit", atRisk: false },

  // Class 8
  { cls: "cls_8", b: "b_8_a", roll: "801", name: "Samarth Shukla", parent: "Giridhar Shukla", atRisk: false },
  { cls: "cls_8", b: "b_8_a", roll: "802", name: "Tanvi Agarwal", parent: "Manoj Agarwal", atRisk: false },
  { cls: "cls_8", b: "b_8_a", roll: "803", name: "Yuvraj Chauhan", parent: "Pratap Chauhan", atRisk: false },
  { cls: "cls_8", b: "b_8_a", roll: "804", name: "Ishita Ganguly", parent: "Sourav Ganguly", atRisk: false },

  // Class 9
  { cls: "cls_9", b: "b_9_a", roll: "901", name: "Rohan Varma", parent: "Anil Varma", atRisk: false },
  { cls: "cls_9", b: "b_9_a", roll: "902", name: "Sneha Mukherjee", parent: "Subir Mukherjee", atRisk: false },
  { cls: "cls_9", b: "b_9_b", roll: "903", name: "Aditya Hegde", parent: "Ravish Hegde", atRisk: false },
  { cls: "cls_9", b: "b_9_b", roll: "904", name: "Meera Choudhary", parent: "Vijay Choudhary", atRisk: false },

  // Class 10
  { cls: "cls_10", b: "b_10_a", roll: "1001", name: "Aarav Sharma", parent: "Rajesh Sharma", atRisk: false },
  { cls: "cls_10", b: "b_10_a", roll: "1002", name: "Priya Patel", parent: "Dinesh Patel", atRisk: false },
  { cls: "cls_10", b: "b_10_b", roll: "1003", name: "Kabir Khan", parent: "Tariq Khan", atRisk: true },
  { cls: "cls_10", b: "b_10_b", roll: "1004", name: "Sneha Reddy", parent: "Venkat Reddy", atRisk: false },

  // Class 11 - Science
  { cls: "cls_11_sci", b: "b_11_sci", roll: "1101", name: "Siddharth Rao", parent: "Krishna Rao", atRisk: false },
  { cls: "cls_11_sci", b: "b_11_sci", roll: "1102", name: "Pooja Iyer", parent: "Raman Iyer", atRisk: false },
  { cls: "cls_11_sci", b: "b_11_sci", roll: "1103", name: "Aditya Kulkarni", parent: "Milind Kulkarni", atRisk: false },
  { cls: "cls_11_sci", b: "b_11_sci", roll: "1104", name: "Divya Nair", parent: "Balan Nair", atRisk: false },

  // Class 11 - Commerce
  { cls: "cls_11_comm", b: "b_11_comm", roll: "1121", name: "Varun Bajaj", parent: "Rahul Bajaj", atRisk: false },
  { cls: "cls_11_comm", b: "b_11_comm", roll: "1122", name: "Simran Kaur", parent: "Harpreet Kaur", atRisk: false },
  { cls: "cls_11_comm", b: "b_11_comm", roll: "1123", name: "Aakash Singhania", parent: "Gautam Singhania", atRisk: false },
  { cls: "cls_11_comm", b: "b_11_comm", roll: "1124", name: "Bhavna Goel", parent: "Pawan Goel", atRisk: false },

  // Class 12 - Science
  { cls: "cls_12_sci", b: "b_12_sci", roll: "1201", name: "Kunal Kapoor", parent: "Anil Kapoor", atRisk: false },
  { cls: "cls_12_sci", b: "b_12_sci", roll: "1202", name: "Neha Saxena", parent: "Rajiv Saxena", atRisk: false },
  { cls: "cls_12_sci", b: "b_12_sci", roll: "1203", name: "Alok Pandey", parent: "Hemant Pandey", atRisk: false },
  { cls: "cls_12_sci", b: "b_12_sci", roll: "1204", name: "Yash Chawla", parent: "Deepak Chawla", atRisk: true },

  // Class 12 - Commerce
  { cls: "cls_12_comm", b: "b_12_comm", roll: "1221", name: "Riya Sen", parent: "Subhash Sen", atRisk: false },
  { cls: "cls_12_comm", b: "b_12_comm", roll: "1222", name: "Harsh Vardhan", parent: "Anand Vardhan", atRisk: false },
  { cls: "cls_12_comm", b: "b_12_comm", roll: "1223", name: "Kritika Malhotra", parent: "Vinod Malhotra", atRisk: false },
  { cls: "cls_12_comm", b: "b_12_comm", roll: "1224", name: "Manish Agarwal", parent: "Satish Agarwal", atRisk: false },
];

async function seedK12() {
  console.log("Signing in demo admin...");
  const cred = await signInWithEmailAndPassword(auth, "demo@attendly.com", "AttendlyDemo2026!");
  const uid = cred.user.uid;
  console.log("Admin logged in:", uid);

  // 1. Classes & Batches
  console.log("Creating/updating Classes 1 to 12...");
  for (const c of CLASSES_CONFIG) {
    await setDoc(doc(db, "classes", c.id), {
      name: c.name,
      created_by: uid
    }, { merge: true });

    for (const b of c.batches) {
      await setDoc(doc(db, "batches", b.id), {
        name: b.name,
        class_id: c.id,
        created_by: uid
      }, { merge: true });
    }
  }

  // 2. Teachers (Profiles, Roles, Assignments)
  console.log("Creating Teachers and Assignments for each class...");
  // Clear old assignments to keep mapping crisp
  const oldAssignments = await getDocs(collection(db, "teacher_assignments"));
  for (const d of oldAssignments.docs) {
    await deleteDoc(d.ref);
  }

  for (const t of TEACHERS_CONFIG) {
    // Write profile
    await setDoc(doc(db, "profiles", t.id), {
      id: t.id,
      full_name: t.name,
      email: t.email
    }, { merge: true });

    // Write role
    const rQ = query(collection(db, "user_roles"), where("user_id", "==", t.id));
    const rSnap = await getDocs(rQ);
    if (rSnap.empty) {
      await setDoc(doc(db, "user_roles", `role_${t.id}`), {
        user_id: t.id,
        role: "teacher"
      });
    }

    // Write assignment
    await setDoc(doc(db, "teacher_assignments", `assign_${t.id}_${t.class_id}`), {
      teacher_id: t.id,
      class_id: t.class_id,
      batch_id: t.batch_id || null
    });
  }

  // 3. Students
  console.log(`Writing ${STUDENT_NAMES.length} student records...`);
  const studentRecords = [];
  for (const s of STUDENT_NAMES) {
    const sId = `std_${s.roll}`;
    const cleanEmail = s.name.toLowerCase().replace(/[^a-z]/g, "") + "@attendly.edu";
    const parentEmail = s.parent.toLowerCase().replace(/[^a-z]/g, "") + "@gmail.com";
    const phone = `+91 98${s.roll.padStart(3, "0")} ${s.roll.padStart(5, "1")}`;
    const parentPhone = `+91 97${s.roll.padStart(3, "0")} ${s.roll.padStart(5, "2")}`;

    const studentData = {
      id: sId,
      name: s.name,
      roll_no: s.roll,
      class_id: s.cls,
      batch_id: s.b,
      email: cleanEmail,
      phone: phone,
      parent_name: s.parent,
      parent_phone: parentPhone,
      parent_email: parentEmail,
      atRisk: s.atRisk
    };

    const { atRisk, ...firestoreDoc } = studentData;
    await setDoc(doc(db, "students", sId), firestoreDoc, { merge: true });
    studentRecords.push(studentData);
  }

  // 4. Attendance for 30 days
  console.log("Generating 30-day realistic attendance records across all classes...");
  const today = new Date();
  const days = [];
  for (let i = 29; i >= 0; i--) {
    days.push(subDays(today, i));
  }

  let currentBatch = writeBatch(db);
  let opCount = 0;
  let totalRecords = 0;

  for (const day of days) {
    const dayOfWeek = getDay(day);
    if (dayOfWeek === 0) continue; // Skip Sunday

    const dateStr = format(day, "yyyy-MM-dd");
    const isToday = (dateStr === format(today, "yyyy-MM-dd"));

    for (const s of studentRecords) {
      // Leave Class 12 Science unmarked today for "classes with no attendance today" alert
      if (isToday && s.class_id === "cls_12_sci") {
        continue;
      }

      let isPresent = true;
      if (s.atRisk) {
        const absentChance = (dayOfWeek === 1 || dayOfWeek === 5) ? 0.45 : 0.35;
        isPresent = Math.random() > absentChance;
      } else {
        isPresent = Math.random() > 0.08;
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

      if (opCount >= 450) {
        await currentBatch.commit();
        console.log(`Committed ${opCount} attendance records (Total: ${totalRecords})...`);
        currentBatch = writeBatch(db);
        opCount = 0;
      }
    }
  }

  if (opCount > 0) {
    await currentBatch.commit();
    console.log(`Committed final ${opCount} records (Total: ${totalRecords})...`);
  }

  console.log("K-12 Seeding Complete!");
  process.exit(0);
}

seedK12().catch(err => {
  console.error("K-12 Seeding Error:", err);
  process.exit(1);
});
