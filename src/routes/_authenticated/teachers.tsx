import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCog, Info, Plus } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, addDoc } from "firebase/firestore";
import { firebaseConfig } from "@/lib/firebase";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/teachers")({
  ssr: false,
  beforeLoad: async () => {
    const user: any = await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        unsubscribe();
        resolve(u);
      });
    });
    if (!user) throw redirect({ to: "/auth" });
    
    const rolesSnap = await getDocs(query(collection(db, "user_roles"), where("user_id", "==", user.uid)));
    const roles = rolesSnap.docs.map(d => d.data());
    const hasAccess = roles.some((r) => r.role === "admin" || r.role === "teacher");
    if (!hasAccess) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Teachers · Attendly" },
      { name: "description", content: "See who has teacher access and assign classes." },
      { property: "og:title", content: "Teachers · Attendly" },
      { property: "og:description", content: "Manage teacher accounts." },
    ],
  }),
  component: TeachersPage,
});

function TeachersPage() {
  const { data } = useQuery({
    queryKey: ["teachers-overview"],
    queryFn: async () => {
      const [rolesSnap, profilesSnap, assignSnap, classesSnap] = await Promise.all([
        getDocs(collection(db, "user_roles")),
        getDocs(collection(db, "profiles")),
        getDocs(collection(db, "teacher_assignments")),
        getDocs(collection(db, "classes")),
      ]);
      const roles = rolesSnap.docs.map(d => d.data());
      const profiles = profilesSnap.docs.map(d => d.data());
      const assign = assignSnap.docs.map(d => d.data());
      const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const teachers = roles.filter((r) => r.role === "teacher").map((r) => {
        const p: any = profiles.find((x: any) => x.id === r.user_id);
        const cls = assign.filter((a) => a.teacher_id === r.user_id).map((a) => classes.find((c: any) => c.id === a.class_id)?.name).filter(Boolean);
        return { id: r.user_id, name: p?.full_name || p?.email || "—", email: p?.email, classes: cls };
      });
      const admins = roles.filter((r) => r.role === "admin").map((r) => {
        const p: any = profiles.find((x: any) => x.id === r.user_id);
        return { id: r.user_id, name: p?.full_name || p?.email || "—", email: p?.email };
      });
      return { teachers, admins };
    },
  });

  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const createTeacher = useMutation({
    mutationFn: async () => {
      // Use secondary app to prevent logging out the admin
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);
      
      try {
        const { user } = await createUserWithEmailAndPassword(secondaryAuth, form.email, form.password);
        await setDoc(doc(db, "profiles", user.uid), {
          id: user.uid,
          full_name: form.name,
        });
        await addDoc(collection(db, "user_roles"), {
          user_id: user.uid,
          role: "teacher"
        });
      } finally {
        await secondaryAuth.signOut();
        await deleteApp(secondaryApp);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teachers-overview"] });
      setOpen(false);
      setForm({ name: "", email: "", password: "" });
      toast.success("Teacher account created!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Teachers & admins</h1>
          <p className="text-muted-foreground">Everyone who has access to Attendly.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add teacher</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create teacher account</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Full name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Password</Label>
                <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">They can log in with this password.</p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => createTeacher.mutate()} disabled={!form.email || !form.password || createTeacher.isPending}>
                Create account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserCog className="h-4 w-4" /> Admins</CardTitle></CardHeader>
          <CardContent>
            {!data?.admins?.length ? <div className="text-muted-foreground">None.</div> : (
              <ul className="space-y-2">
                {data.admins.map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded border bg-background px-3 py-2">
                    <div>
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-muted-foreground">{a.email}</div>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Admin</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserCog className="h-4 w-4" /> Teachers</CardTitle></CardHeader>
          <CardContent>
            {!data?.teachers?.length ? <div className="text-muted-foreground">No teachers yet.</div> : (
              <ul className="space-y-2">
                {data.teachers.map((t) => (
                  <li key={t.id} className="rounded border bg-background px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.email}</div>
                      </div>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{t.classes.length} class{t.classes.length === 1 ? "" : "es"}</span>
                    </div>
                    {t.classes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1 text-xs">
                        {t.classes.map((c) => (
                          <span key={c} className="rounded-full bg-accent px-2 py-0.5">{c}</span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
