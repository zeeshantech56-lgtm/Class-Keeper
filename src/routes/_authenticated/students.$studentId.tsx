import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subDays, subMonths, addMonths } from "date-fns";
import { ArrowLeft, Mail, Phone, User, CalendarRange } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";

export const Route = createFileRoute("/_authenticated/students/$studentId")({
  head: ({ params }) => ({
    meta: [
      { title: "Student · Attendly" },
      { name: "description", content: "Individual student attendance history." },
      { property: "og:title", content: "Student · Attendly" },
      { property: "og:description", content: "Attendance timeline and calendar." },
    ],
  }),
  component: StudentDetail,
});

function StudentDetail() {
  const { studentId } = useParams({ from: "/_authenticated/students/$studentId" });
  const [monthCursor, setMonthCursor] = useState(new Date());

  const { data, isLoading } = useQuery({
    queryKey: ["student-detail", studentId],
    queryFn: async () => {
      const [{ data: student }, { data: attendance }, { data: threshold }] = await Promise.all([
        supabase.from("students").select("*, classes(name), batches(name)").eq("id", studentId).maybeSingle(),
        supabase.from("attendance").select("*").eq("student_id", studentId).order("date", { ascending: false }),
        supabase.from("app_settings").select("value").eq("key", "at_risk_threshold").maybeSingle(),
      ]);
      return {
        student,
        attendance: attendance ?? [],
        threshold: Number(threshold?.value ?? 75),
      };
    },
  });

  if (isLoading || !data) return <div className="text-muted-foreground">Loading…</div>;
  if (!data.student) return <div>Student not found.</div>;

  const s = data.student;
  const records = data.attendance;
  const totalDays = records.length;
  const presentDays = records.filter((r) => r.status === "present").length;
  const absentDays = totalDays - presentDays;
  const pct = totalDays ? Math.round((presentDays / totalDays) * 100) : 100;

  // Longest streaks
  const sortedAsc = [...records].sort((a, b) => a.date.localeCompare(b.date));
  let curP = 0, curA = 0, maxP = 0, maxA = 0;
  sortedAsc.forEach((r) => {
    if (r.status === "present") { curP++; curA = 0; if (curP > maxP) maxP = curP; }
    else { curA++; curP = 0; if (curA > maxA) maxA = curA; }
  });

  // Calendar for month
  const monthStart = startOfMonth(monthCursor);
  const monthEnd = endOfMonth(monthCursor);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const byDate = new Map(records.map((r) => [r.date as string, r.status as "present" | "absent"]));

  const atRisk = totalDays > 0 && pct < data.threshold;

  function exportCsv() {
    downloadCsv(`${s.name}-attendance.csv`, records.map((r) => ({
      date: r.date, status: r.status,
    })));
  }

  return (
    <div className="space-y-6">
      <Link to="/students" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to students
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">{s.name}</h1>
          <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>Roll #{s.roll_no}</span>
            <span>·</span>
            <span>{(s.classes as { name: string } | null)?.name}</span>
            {s.batches && <><span>·</span><span>{(s.batches as { name: string }).name}</span></>}
            {atRisk && <Badge variant="destructive">At risk</Badge>}
          </div>
        </div>
        <Button variant="outline" onClick={exportCsv}><CalendarRange className="mr-2 h-4 w-4" /> Export CSV</Button>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Attendance" value={`${pct}%`} tone={pct >= data.threshold ? "success" : "destructive"} />
        <Stat label="Present" value={presentDays} />
        <Stat label="Absent" value={absentDays} />
        <Stat label="Longest streak" value={`${maxP} day${maxP === 1 ? "" : "s"}`} sub={`Worst absent streak: ${maxA}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Calendar</CardTitle>
              <p className="text-sm text-muted-foreground">{format(monthCursor, "MMMM yyyy")}</p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => setMonthCursor(subMonths(monthCursor, 1))}>‹</Button>
              <Button size="sm" variant="outline" onClick={() => setMonthCursor(new Date())}>Today</Button>
              <Button size="sm" variant="outline" onClick={() => setMonthCursor(addMonths(monthCursor, 1))}>›</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {Array.from({ length: monthStart.getDay() }).map((_, i) => <div key={`e${i}`} />)}
              {days.map((d) => {
                const key = format(d, "yyyy-MM-dd");
                const st = byDate.get(key);
                return (
                  <div
                    key={key}
                    className={cn(
                      "aspect-square rounded-md border text-sm flex items-center justify-center",
                      st === "present" && "bg-success/15 border-success/40 text-success",
                      st === "absent" && "bg-destructive/10 border-destructive/40 text-destructive",
                      !st && "bg-muted/30 text-muted-foreground",
                    )}
                    title={`${key} — ${st ?? "no record"}`}
                  >
                    {d.getDate()}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-success/40" /> Present</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-destructive/30" /> Absent</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-muted/50" /> No record</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Parent / Guardian</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {s.parent_name && <Info icon={User} value={s.parent_name} />}
            {s.parent_phone && <Info icon={Phone} value={s.parent_phone} />}
            {s.parent_email && <Info icon={Mail} value={s.parent_email} />}
            {!s.parent_name && !s.parent_phone && !s.parent_email && (
              <div className="text-muted-foreground">No parent contact on file.</div>
            )}
            {(s.email || s.phone) && (
              <div className="mt-3 border-t pt-3">
                <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Student</div>
                {s.email && <Info icon={Mail} value={s.email} />}
                {s.phone && <Info icon={Phone} value={s.phone} />}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent history</CardTitle></CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No attendance recorded yet.</div>
          ) : (
            <ul className="divide-y">
              {records.slice(0, 30).map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{format(new Date(r.date), "EEEE, MMM d yyyy")}</span>
                  <Badge variant={r.status === "present" ? "default" : "destructive"} className={r.status === "present" ? "bg-success text-success-foreground" : ""}>{r.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: "success" | "destructive" }) {
  return (
    <Card>
      <CardContent className="py-5">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn(
          "mt-1 text-2xl font-semibold",
          tone === "success" && "text-success",
          tone === "destructive" && "text-destructive",
        )}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function Info({ icon: Icon, value }: { icon: typeof User; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span>{value}</span>
    </div>
  );
}
