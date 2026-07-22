import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Users, Search, Edit2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({
    meta: [
      { title: "Students · Attendly" },
      { name: "description", content: "Manage student records with parent contact info." },
      { property: "og:title", content: "Students · Attendly" },
      { property: "og:description", content: "Manage students and their guardians." },
    ],
  }),
  component: StudentsPage,
});

const studentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  roll_no: z.string().trim().min(1).max(30),
  class_id: z.string().uuid(),
  batch_id: z.string().uuid().nullable(),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  parent_name: z.string().trim().max(100).optional().or(z.literal("")),
  parent_phone: z.string().trim().max(30).optional().or(z.literal("")),
  parent_email: z.string().trim().email().max(255).optional().or(z.literal("")),
});

type StudentForm = z.infer<typeof studentSchema>;

const emptyForm: StudentForm = {
  name: "", roll_no: "", class_id: "", batch_id: null,
  email: "", phone: "", parent_name: "", parent_phone: "", parent_email: "",
};

function StudentsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<StudentForm>(emptyForm);

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => (await supabase.from("classes").select("*").order("name")).data ?? [],
  });
  const { data: batches = [] } = useQuery({
    queryKey: ["batches"],
    queryFn: async () => (await supabase.from("batches").select("*").order("name")).data ?? [],
  });
  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: async () => (await supabase.from("students").select("*").order("name")).data ?? [],
  });

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (filterClass !== "all" && s.class_id !== filterClass) return false;
      if (q && !s.name.toLowerCase().includes(q.toLowerCase()) && !s.roll_no.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [students, q, filterClass]);

  const save = useMutation({
    mutationFn: async () => {
      const parsed = studentSchema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.errors[0].message);
      const payload = {
        ...parsed.data,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        parent_name: parsed.data.parent_name || null,
        parent_phone: parsed.data.parent_phone || null,
        parent_email: parsed.data.parent_email || null,
      };
      if (editId) {
        const { error } = await supabase.from("students").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("students").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      setOpen(false);
      setForm(emptyForm);
      setEditId(null);
      toast.success(editId ? "Student updated" : "Student added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["students"] }); toast.success("Removed"); },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() {
    setEditId(null);
    setForm({ ...emptyForm, class_id: classes[0]?.id ?? "" });
    setOpen(true);
  }

  function openEdit(s: typeof students[number]) {
    setEditId(s.id);
    setForm({
      name: s.name, roll_no: s.roll_no,
      class_id: s.class_id, batch_id: s.batch_id,
      email: s.email ?? "", phone: s.phone ?? "",
      parent_name: s.parent_name ?? "", parent_phone: s.parent_phone ?? "", parent_email: s.parent_email ?? "",
    });
    setOpen(true);
  }

  const batchesForClass = batches.filter((b) => b.class_id === form.class_id);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Students</h1>
          <p className="text-muted-foreground">{students.length} total</p>
        </div>
        <Button onClick={openNew} disabled={classes.length === 0}>
          <Plus className="mr-2 h-4 w-4" /> Add student
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or roll no…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Users className="mx-auto mb-3 h-10 w-10 opacity-40" />
          {students.length === 0 ? "No students yet. Add your first one." : "No matches."}
        </CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Roll</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="hidden md:table-cell">Parent</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const cls = classes.find((c) => c.id === s.class_id);
                  const bat = batches.find((b) => b.id === s.batch_id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link to="/students/$studentId" params={{ studentId: s.id }} className="font-medium hover:underline">
                          {s.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{s.roll_no}</TableCell>
                      <TableCell>{cls?.name}</TableCell>
                      <TableCell className="text-muted-foreground">{bat?.name ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {s.parent_name}{s.parent_phone ? ` · ${s.parent_phone}` : ""}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => del.mutate(s.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editId ? "Edit student" : "Add student"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Name" required>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Roll number" required>
              <Input value={form.roll_no} onChange={(e) => setForm({ ...form, roll_no: e.target.value })} />
            </Field>
            <Field label="Class" required>
              <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v, batch_id: null })}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Batch">
              <Select value={form.batch_id ?? "none"} onValueChange={(v) => setForm({ ...form, batch_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {batchesForClass.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Student email">
              <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Student phone">
              <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <div className="md:col-span-2 mt-2 border-t pt-3">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Parent / Guardian</div>
            </div>
            <Field label="Parent name">
              <Input value={form.parent_name ?? ""} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} />
            </Field>
            <Field label="Parent phone">
              <Input value={form.parent_phone ?? ""} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} />
            </Field>
            <Field label="Parent email">
              <Input type="email" value={form.parent_email ?? ""} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{editId ? "Save changes" : "Add student"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  );
}
