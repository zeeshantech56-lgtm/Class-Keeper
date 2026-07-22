import { useQuery } from "@tanstack/react-query";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// Helper to get current user wrapped in a promise since it takes time to initialize
const getFirebaseUser = () => new Promise((resolve) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    unsubscribe();
    resolve(user);
  });
});

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const user: any = await getFirebaseUser();
      if (!user) return null;
      
      let profile = null;
      const profileSnap = await getDoc(doc(db, "profiles", user.uid));
      if (profileSnap.exists()) profile = profileSnap.data();

      const rolesRef = collection(db, "user_roles");
      const q = query(rolesRef, where("user_id", "==", user.uid));
      const rolesSnap = await getDocs(q);
      
      const roleList = rolesSnap.docs.map(d => d.data().role);
      
      return {
        user,
        profile,
        roles: roleList,
        isAdmin: roleList.includes("admin") || roleList.includes("teacher"),
        isSuperAdmin: roleList.includes("admin"),
        isTeacher: roleList.includes("teacher"),
      };
    },
  });
}
