import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, startOfMonth, endOfMonth, startOfYear, subMonths, subDays } from "date-fns";
import { Download, FileBarChart, Phone } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports · Attendly" },
      { name: "description", content: "Custom date range attendance reports with CSV export." },
      { property: "og:title", content: "Reports · Attendly" },
      { property: "og:description", content: "Export attendance data for any date range." },
    ],
  }),
  component: ReportsPage,
});

type Preset = "today" | "week" | "month" | "last-month" | "year" | "custom";

function ReportsPage() {
  const [preset, setPreset] = useState<Preset>("month");
  const [from, setFrom] = useState<string>(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [to, setTo] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [classId, setClassId] = useState<string>("all");
  const [batchId, setBatchId] = useState<string>("all");

  function applyPreset(p: Preset) {
    setPreset(p);
    const now = new Date();
    if (p === "today") { setFrom(format(now, "yyyy-MM-dd")); setTo(format(now, "yyyy-MM-dd")); }
    else if (p === "week") { setFrom(format(subDays(now, 6), "yyyy-MM-dd")); setTo(format(now, "yyyy-MM-dd")); }
    else if (p === "month") { setFrom(format(startOfMonth(now), "yyyy-MM-dd")); setTo(format(now, "yyyy-MM-dd")); }
    else if (p === "last-month") { const lm = subMonths(now, 1); setFrom(format(startOfMonth(lm), "yyyy-MM-dd")); setTo(format(endOfMonth(lm), "yyyy-MM-dd")); }
    else if (p === "year") { setFrom(format(startOfYear(now), "yyyy-MM-dd")); setTo(format(now, "yyyy-MM-dd")); }
  }

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "classes"), orderBy("name")));
      return snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    }
  });
  const { data: batches = [] } = useQuery({
    queryKey: ["batches"],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "batches"), orderBy("name")));
      return snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    }
  });

  const { data, isLoading } = useQuery({
    queryKey: ["report", from, to, classId, batchId],
    queryFn: async () => {
      let sQ = query(collection(db, "students"));
      if (classId !== "all") sQ = query(collection(db, "students"), where("class_id", "==", classId));
      if (batchId !== "all") sQ = query(collection(db, "students"), where("class_id", "==", classId), where("batch_id", "==", batchId));
      const sSnap = await getDocs(sQ);
      const students = sSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const studentIds = students.map((s) => s.id);

      const aQ = query(collection(db, "attendance"), where("date", ">=", from), where("date", "<=", to));
      const aSnap = await getDocs(aQ);
      let attendance = aSnap.docs.map(d => d.data()) as any[];
      
      if (studentIds.length > 0) {
        const idSet = new Set(studentIds);
        attendance = attendance.filter(a => idSet.has(a.student_id));
      }

      return { students, attendance };
    },
  });

  const rows = useMemo(() => {
    if (!data) return [];
    const classMap = new Map(classes.map((c) => [c.id, c.name]));
    const batchMap = new Map(batches.map((b) => [b.id, b.name]));
    return data.students.map((s) => {
      const recs = data.attendance.filter((a) => a.student_id === s.id);
      const present = recs.filter((r) => r.status === "present").length;
      const absent = recs.length - present;
      const pct = recs.length ? Math.round((present / recs.length) * 100) : 0;
      return {
        student: s.name,
        roll_no: s.roll_no,
        class: classMap.get(s.class_id) ?? "",
        batch: s.batch_id ? batchMap.get(s.batch_id) ?? "" : "",
        present,
        absent,
        total_days: recs.length,
        attendance_pct: pct,
        parent_name: s.parent_name ?? "",
        parent_phone: s.parent_phone ?? "",
        parent_email: s.parent_email ?? "",
      };
    });
  }, [data, classes, batches]);

  const detailRows = useMemo(() => {
    if (!data) return [];
    const classMap = new Map(classes.map((c) => [c.id, c.name]));
    const sMap = new Map(data.students.map((s) => [s.id, s]));
    return data.attendance.map((a) => {
      const s = sMap.get(a.student_id);
      return {
        date: a.date,
        student: s?.name ?? "",
        roll_no: s?.roll_no ?? "",
        class: s ? classMap.get(s.class_id) : "",
        status: a.status,
      };
    });
  }, [data, classes]);

  const summary = useMemo(() => {
    const totalDays = rows.reduce((s, r) => s + r.total_days, 0);
    const totalPresent = rows.reduce((s, r) => s + r.present, 0);
    return {
      students: rows.length,
      records: totalDays,
      avgAttendance: totalDays ? Math.round((totalPresent / totalDays) * 100) : 0,
    };
  }, [rows]);

  function exportSummary() {
    if (rows.length === 0) return toast.error("Nothing to export");
    downloadCsv(`attendance-summary-${from}-to-${to}.csv`, rows);
  }

  function exportDetail() {
    if (detailRows.length === 0) return toast.error("Nothing to export");
    downloadCsv(`attendance-detail-${from}-to-${to}.csv`, detailRows);
  }

  function exportAbsenteeContacts() {
    const absentees = rows.filter((r) => r.absent > 0).map((r) => ({
      student: r.student, roll_no: r.roll_no, class: r.class,
      absent_days: r.absent, attendance_pct: r.attendance_pct,
      parent_name: r.parent_name, parent_phone: r.parent_phone, parent_email: r.parent_email,
    }));
    if (absentees.length === 0) return toast.error("No absentees in this range");
    downloadCsv(`absentee-contacts-${from}-to-${to}.csv`, absentees);
  }

  const batchesForClass = batches.filter((b) => b.class_id === classId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Reports</h1>
        <p className="text-muted-foreground">Pick a range, filter, export CSV.</p>
      </header>

      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex flex-wrap gap-2">
            {(["today", "week", "month", "last-month", "year", "custom"] as Preset[]).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={preset === p ? "default" : "outline"}
                onClick={() => applyPreset(p)}
              >
                {p === "today" ? "Today" : p === "week" ? "This week" : p === "month" ? "This month" : p === "last-month" ? "Last month" : p === "year" ? "This year" : "Custom"}
              </Button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreset("custom"); }} />
            </div>
            <div className="space-y-1">
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPreset("custom"); }} />
            </div>
            <div className="space-y-1">
              <Label>Class</Label>
              <Select value={classId} onValueChange={(v) => { setClassId(v); setBatchId("all"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Batch</Label>
              <Select value={batchId} onValueChange={setBatchId} disabled={classId === "all"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All batches</SelectItem>
                  {batchesForClass.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <StatMini label="Students" value={summary.students} />
        <StatMini label="Attendance records" value={summary.records} />
        <StatMini label="Avg attendance" value={`${summary.avgAttendance}%`} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={exportSummary}><Download className="mr-2 h-4 w-4" /> Summary CSV</Button>
        <Button variant="outline" onClick={exportDetail}><Download className="mr-2 h-4 w-4" /> Detailed CSV</Button>
        <Button variant="outline" onClick={exportAbsenteeContacts}><Phone className="mr-2 h-4 w-4" /> Absentee contacts</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileBarChart className="h-4 w-4" /> Preview</CardTitle>
          <CardDescription>Per-student summary for the selected range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Present</TableHead>
                  <TableHead className="text-right">Absent</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    {isLoading ? "Loading…" : "No data for this range/filter."}
                  </TableCell></TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={`${r.student}-${r.roll_no}`}>
                    <TableCell className="font-medium">{r.student}</TableCell>
                    <TableCell className="text-muted-foreground">{r.roll_no}</TableCell>
                    <TableCell>{r.class}{r.batch && ` · ${r.batch}`}</TableCell>
                    <TableCell className="text-right text-success">{r.present}</TableCell>
                    <TableCell className="text-right text-destructive">{r.absent}</TableCell>
                    <TableCell className="text-right font-semibold">{r.attendance_pct}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string | number }) {
  return (
    <Card><CardContent className="py-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </CardContent></Card>
  );
}
