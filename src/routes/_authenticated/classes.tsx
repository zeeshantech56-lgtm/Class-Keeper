import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, orderBy } from "firebase/firestore";
import { useCurrentUser } from "@/lib/auth-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Users, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/classes")({
  head: () => ({
    meta: [
      { title: "Classes · Attendly" },
      { name: "description", content: "Create classes, add batches, and assign teachers." },
      { property: "og:title", content: "Classes · Attendly" },
      { property: "og:description", content: "Manage classes, batches and teacher assignments." },
    ],
  }),
  component: ClassesPage,
});

function ClassesPage() {
  const { data: me } = useCurrentUser();
  const isAdmin = me?.isAdmin ?? false;
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [newClass, setNewClass] = useState("");

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const q = query(collection(db, "classes"), orderBy("name"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    },
  });

  const { data: batches = [] } = useQuery({
    queryKey: ["batches"],
    queryFn: async () => {
      const q = query(collection(db, "batches"), orderBy("name"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    },
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-with-roles"],
    queryFn: async () => {
      const rolesSnap = await getDocs(collection(db, "user_roles"));
      const roles = rolesSnap.docs.map(d => d.data());
      const teacherIds = roles.filter((r) => r.role === "teacher").map((r) => r.user_id);
      if (teacherIds.length === 0) return [];
      
      const profilesSnap = await getDocs(collection(db, "profiles"));
      const profiles = profilesSnap.docs.map(d => ({ id: d.id, ...d.data() }) as any);
      return profiles.filter(p => teacherIds.includes(p.id));
    },
    enabled: isAdmin,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["teacher-assignments"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "teacher_assignments"));
      return snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    },
  });

  const createClass = useMutation({
    mutationFn: async (name: string) => {
      await addDoc(collection(db, "classes"), { name, created_by: me!.user.uid });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      setOpenCreate(false);
      setNewClass("");
      toast.success("Class created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delClass = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, "classes", id));
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Class deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Classes</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Create classes, add batches, assign teachers." : "Classes you're assigned to."}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> New class</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create class</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="cname">Class name</Label>
                <Input id="cname" placeholder="e.g. Grade 10" value={newClass} onChange={(e) => setNewClass(e.target.value)} />
              </div>
              <DialogFooter>
                <Button onClick={() => createClass.mutate(newClass)} disabled={!newClass.trim() || createClass.isPending}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </header>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <GraduationCap className="mx-auto mb-3 h-10 w-10 opacity-40" />
            {isAdmin ? "No classes yet. Click 'New class' to add one." : "You haven't been assigned to any classes yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {classes.map((c) => (
            <ClassCard
              key={c.id}
              cls={c}
              batches={batches.filter((b) => b.class_id === c.id)}
              teachers={teachers}
              assignments={assignments.filter((a) => a.class_id === c.id)}
              isAdmin={isAdmin}
              onDelete={() => delClass.mutate(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClassCard({ cls, batches, teachers, assignments, isAdmin, onDelete }: {
  cls: { id: string; name: string };
  batches: { id: string; name: string; class_id: string }[];
  teachers: { id: string; full_name: string | null; email: string | null }[];
  assignments: { teacher_id: string; class_id: string }[];
  isAdmin: boolean;
  onDelete: () => void;
}) {
  const qc = useQueryClient();
  const [newBatch, setNewBatch] = useState("");
  const [selTeacher, setSelTeacher] = useState("");

  const addBatch = useMutation({
    mutationFn: async () => {
      await addDoc(collection(db, "batches"), { class_id: cls.id, name: newBatch });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["batches"] }); setNewBatch(""); toast.success("Batch added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delBatch = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, "batches", id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["batches"] }),
  });

  const toggleTeacher = useMutation({
    mutationFn: async ({ teacherId, add }: { teacherId: string; add: boolean }) => {
      if (add) {
        await addDoc(collection(db, "teacher_assignments"), { teacher_id: teacherId, class_id: cls.id });
      } else {
        const q = query(collection(db, "teacher_assignments"), where("teacher_id", "==", teacherId), where("class_id", "==", cls.id));
        const snap = await getDocs(q);
        for (const docSnap of snap.docs) {
          await deleteDoc(docSnap.ref);
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher-assignments"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const assignedIds = new Set(assignments.map((a) => a.teacher_id));
  const availableTeachers = teachers.filter((t) => !assignedIds.has(t.id));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> {cls.name}</CardTitle>
        {isAdmin && (
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Batches</div>
          {batches.length === 0 ? (
            <div className="text-sm text-muted-foreground">No batches yet.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {batches.map((b) => (
                <Badge key={b.id} variant="secondary" className="gap-1 pr-1">
                  {b.name}
                  {isAdmin && (
                    <button onClick={() => delBatch.mutate(b.id)} className="ml-1 rounded-full p-0.5 hover:bg-destructive/20"><Trash2 className="h-3 w-3" /></button>
                  )}
                </Badge>
              ))}
            </div>
          )}
          {isAdmin && (
            <div className="mt-2 flex gap-2">
              <Input placeholder="Add batch (e.g. Morning)" value={newBatch} onChange={(e) => setNewBatch(e.target.value)} />
              <Button size="sm" onClick={() => addBatch.mutate()} disabled={!newBatch.trim()}>Add</Button>
            </div>
          )}
        </div>

        {isAdmin && (
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Assigned teachers</div>
            {assignments.length === 0 ? (
              <div className="text-sm text-muted-foreground">No teachers assigned.</div>
            ) : (
              <ul className="space-y-1">
                {assignments.map((a) => {
                  const t = teachers.find((x) => x.id === a.teacher_id);
                  return (
                    <li key={a.teacher_id} className="flex items-center justify-between rounded border bg-background px-3 py-1.5 text-sm">
                      <span>{t?.full_name || t?.email || "Unknown"}</span>
                      <Button variant="ghost" size="sm" onClick={() => toggleTeacher.mutate({ teacherId: a.teacher_id, add: false })}>
                        Remove
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            {availableTeachers.length > 0 && (
              <div className="mt-2 flex gap-2">
                <Select value={selTeacher} onValueChange={setSelTeacher}>
                  <SelectTrigger><SelectValue placeholder="Assign teacher" /></SelectTrigger>
                  <SelectContent>
                    {availableTeachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.full_name || t.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => { if (selTeacher) { toggleTeacher.mutate({ teacherId: selTeacher, add: true }); setSelTeacher(""); } }}>Assign</Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
