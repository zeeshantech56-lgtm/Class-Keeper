import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, doc, writeBatch } from "firebase/firestore";
import { useCurrentUser } from "@/lib/auth-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckSquare, XSquare, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "Take Attendance · Attendly" },
      { name: "description", content: "Mark present/absent for a class and date." },
      { property: "og:title", content: "Take Attendance · Attendly" },
      { property: "og:description", content: "One-tap attendance for your class." },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [classId, setClassId] = useState<string>("");
  const [batchId, setBatchId] = useState<string>("all");
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [marks, setMarks] = useState<Record<string, "present" | "absent">>({});

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "classes"), orderBy("name")));
      return snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    },
  });
  const { data: batches = [] } = useQuery({
    queryKey: ["batches"],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "batches"), orderBy("name")));
      return snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    },
  });

  useEffect(() => {
    if (!classId && classes.length) setClassId(classes[0].id);
  }, [classes, classId]);

  const { data: students = [] } = useQuery({
    queryKey: ["students-for-attendance", classId, batchId],
    queryFn: async () => {
      if (!classId) return [];
      let qObj = query(collection(db, "students"), where("class_id", "==", classId), orderBy("roll_no"));
      if (batchId !== "all") {
        qObj = query(collection(db, "students"), where("class_id", "==", classId), where("batch_id", "==", batchId), orderBy("roll_no"));
      }
      const snap = await getDocs(qObj);
      return snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    },
    enabled: !!classId,
  });

  const { data: existing = [] } = useQuery({
    queryKey: ["attendance-existing", classId, date],
    queryFn: async () => {
      if (!classId) return [];
      const q = query(collection(db, "attendance"), where("class_id", "==", classId), where("date", "==", date));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    },
    enabled: !!classId,
  });

  useEffect(() => {
    const m: Record<string, "present" | "absent"> = {};
    existing.forEach((r) => { m[r.student_id] = r.status as "present" | "absent"; });
    setMarks(m);
  }, [existing]);

  const batchesForClass = batches.filter((b) => b.class_id === classId);

  function set(id: string, status: "present" | "absent") {
    setMarks((m) => ({ ...m, [id]: status }));
  }

  function markAllPresent() {
    const m: Record<string, "present" | "absent"> = {};
    students.forEach((s) => { m[s.id] = "present"; });
    setMarks(m);
  }

  function markAllAbsent() {
    const m: Record<string, "present" | "absent"> = {};
    students.forEach((s) => { m[s.id] = "absent"; });
    setMarks(m);
  }

  const save = useMutation({
    mutationFn: async () => {
      const batch = writeBatch(db);
      students.forEach((s) => {
        const ref = doc(db, "attendance", `${s.id}_${date}`);
        batch.set(ref, {
          student_id: s.id,
          class_id: classId,
          batch_id: s.batch_id,
          date,
          status: marks[s.id] ?? "absent",
          marked_by: me!.user.uid,
        }, { merge: true });
      });
      await batch.commit();
    },
    onSuccess: () => {
      toast.success("Attendance saved");
      qc.invalidateQueries({ queryKey: ["attendance-existing"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const presentCount = Object.values(marks).filter((v) => v === "present").length;
  const absentCount = Object.values(marks).filter((v) => v === "absent").length;
  const unmarked = students.length - presentCount - absentCount;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Take attendance</h1>
        <p className="text-muted-foreground">Pick a class, date, then tap through the roster.</p>
      </header>

      <Card>
        <CardContent className="grid gap-3 py-4 md:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Class</label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Batch</label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All batches</SelectItem>
                {batchesForClass.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={format(new Date(), "yyyy-MM-dd")} />
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending || students.length === 0}>
              {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {students.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          {classId ? "No students in this selection yet." : "Pick a class to start."}
        </CardContent></Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={markAllPresent}><CheckSquare className="mr-1.5 h-4 w-4" /> Mark all present</Button>
            <Button size="sm" variant="outline" onClick={markAllAbsent}><XSquare className="mr-1.5 h-4 w-4" /> Mark all absent</Button>
            <div className="ml-auto flex gap-3 text-sm">
              <span className="text-success">Present: {presentCount}</span>
              <span className="text-destructive">Absent: {absentCount}</span>
              {unmarked > 0 && <span className="text-muted-foreground">Unmarked: {unmarked}</span>}
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {students.map((s) => {
              const st = marks[s.id];
              return (
                <div key={s.id} className={cn(
                  "flex items-center justify-between rounded-xl border bg-card p-3 transition-colors",
                  st === "present" && "border-success/40 bg-success/5",
                  st === "absent" && "border-destructive/40 bg-destructive/5",
                )}>
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">Roll {s.roll_no}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={st === "present" ? "default" : "outline"}
                      className={cn(st === "present" && "bg-success hover:bg-success/90")}
                      onClick={() => set(s.id, "present")}
                    >P</Button>
                    <Button
                      size="sm"
                      variant={st === "absent" ? "default" : "outline"}
                      className={cn(st === "absent" && "bg-destructive hover:bg-destructive/90")}
                      onClick={() => set(s.id, "absent")}
                    >A</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
