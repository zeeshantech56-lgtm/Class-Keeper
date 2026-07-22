import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCog, Info } from "lucide-react";

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
    const isAdmin = roles.some((r) => r.role === "admin");
    if (!isAdmin) throw redirect({ to: "/dashboard" });
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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Teachers & admins</h1>
        <p className="text-muted-foreground">Everyone who has access to Attendly.</p>
      </header>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 py-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <div className="font-medium">Adding a teacher</div>
            <div className="text-muted-foreground">
              Ask the teacher to sign up at <span className="font-mono">/auth</span> using the "Sign up" tab. Since an admin already exists, new sign-ups automatically become teachers. Then assign them to specific classes from the <span className="font-medium">Classes</span> page.
            </div>
          </div>
        </CardContent>
      </Card>

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
