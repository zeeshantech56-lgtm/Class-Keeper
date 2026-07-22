import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth-hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Users, UserCheck, UserX, AlertCircle,
  ArrowRight, CalendarCheck, Award, ClipboardList,
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, differenceInDays } from "date-fns";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Attendly" },
      { name: "description", content: "Today's attendance snapshot, trends, at-risk students and class health." },
      { property: "og:title", content: "Dashboard · Attendly" },
      { property: "og:description", content: "Full-picture attendance analytics." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useCurrentUser();
  const isAdmin = me?.isAdmin ?? false;

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const from30 = format(subDays(new Date(), 29), "yyyy-MM-dd");

      const [studentsRes, classesRes, todayRes, yesterdayRes, monthRes, thresholdRes] = await Promise.all([
        supabase.from("students").select("id, class_id, batch_id, name, roll_no"),
        supabase.from("classes").select("id, name"),
        supabase.from("attendance").select("student_id, class_id, status").eq("date", today),
        supabase.from("attendance").select("status").eq("date", yesterday),
        supabase.from("attendance").select("date, status, class_id, student_id").gte("date", from30).lte("date", today),
        supabase.from("app_settings").select("value").eq("key", "at_risk_threshold").maybeSingle(),
      ]);

      const students = studentsRes.data ?? [];
      const classes = classesRes.data ?? [];
      const todayA = todayRes.data ?? [];
      const yA = yesterdayRes.data ?? [];
      const monthA = monthRes.data ?? [];
      const threshold = Number(thresholdRes.data?.value ?? 75);

      const presentToday = todayA.filter((r) => r.status === "present").length;
      const absentToday = todayA.filter((r) => r.status === "absent").length;
      const totalStudents = students.length;
      const attRateToday = totalStudents ? Math.round((presentToday / totalStudents) * 100) : 0;

      const presentY = yA.filter((r) => r.status === "present").length;
      const totalY = yA.length;
      const attRateY = totalY ? Math.round((presentY / totalY) * 100) : 0;

      // Classes with no attendance today
      const classesMarked = new Set(todayA.map((r) => r.class_id));
      const notMarked = classes.filter((c) => !classesMarked.has(c.id));

      // Per-class attendance %
      const classStats = classes.map((c) => {
        const rows = monthA.filter((r) => r.class_id === c.id);
        const p = rows.filter((r) => r.status === "present").length;
        const pct = rows.length ? Math.round((p / rows.length) * 100) : 0;
        return { id: c.id, name: c.name, pct, records: rows.length };
      }).sort((a, b) => b.pct - a.pct);

      // Daily trend (last 30 days)
      const dayMap = new Map<string, { p: number; a: number }>();
      monthA.forEach((r) => {
        const d = String(r.date);
        const cur = dayMap.get(d) ?? { p: 0, a: 0 };
        if (r.status === "present") cur.p++; else cur.a++;
        dayMap.set(d, cur);
      });
      const trend = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() }).map((d) => {
        const key = format(d, "yyyy-MM-dd");
        const v = dayMap.get(key) ?? { p: 0, a: 0 };
        const total = v.p + v.a;
        return {
          date: format(d, "MMM d"),
          fullDate: key,
          rate: total ? Math.round((v.p / total) * 100) : null,
          present: v.p,
          absent: v.a,
        };
      });

      // Day-of-week absence pattern (last 30 days)
      const dow = Array.from({ length: 7 }, () => ({ p: 0, a: 0 }));
      monthA.forEach((r) => {
        const d = new Date(String(r.date));
        const idx = d.getDay();
        if (r.status === "present") dow[idx].p++; else dow[idx].a++;
      });
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dowStats = dow.map((v, i) => ({
        day: dayNames[i],
        absenceRate: v.p + v.a > 0 ? Math.round((v.a / (v.p + v.a)) * 100) : 0,
      }));

      // Per-student stats (attendance %)
      const perStudent = new Map<string, { p: number; a: number }>();
      monthA.forEach((r) => {
        const cur = perStudent.get(r.student_id) ?? { p: 0, a: 0 };
        if (r.status === "present") cur.p++; else cur.a++;
        perStudent.set(r.student_id, cur);
      });
      const studentPct = students.map((s) => {
        const v = perStudent.get(s.id) ?? { p: 0, a: 0 };
        const total = v.p + v.a;
        return { ...s, pct: total ? Math.round((v.p / total) * 100) : 100, days: total };
      });

      const atRisk = studentPct.filter((s) => s.days > 0 && s.pct < threshold).sort((a, b) => a.pct - b.pct);
      const perfectAttendance = studentPct.filter((s) => s.days >= 5 && s.pct === 100).slice(0, 10);

      // Absentees today
      const absenteeIds = new Set(todayA.filter((r) => r.status === "absent").map((r) => r.student_id));
      const absenteesToday = students.filter((s) => absenteeIds.has(s.id));
      const presenteeIds = new Set(todayA.filter((r) => r.status === "present").map((r) => r.student_id));
      const presenteesToday = students.filter((s) => presenteeIds.has(s.id));

      return {
        totalStudents,
        totalClasses: classes.length,
        presentToday,
        absentToday,
        attRateToday,
        attRateY,
        notMarked,
        classStats,
        trend,
        dowStats,
        atRisk,
        perfectAttendance,
        threshold,
        absenteesToday,
        presenteesToday,
      };
    },
  });

  if (isLoading || !data) {
    return <div className="text-muted-foreground">Loading dashboard…</div>;
  }

  const trendDiff = data.attRateToday - data.attRateY;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Good {greeting()}, {me?.profile?.full_name?.split(" ")[0] ?? "there"}</h1>
          <p className="text-muted-foreground">Here's what's happening today · {format(new Date(), "EEEE, MMMM d")}</p>
        </div>
        <Badge variant="secondary" className="hidden md:inline-flex">{isAdmin ? "Admin view" : "Teacher view"}</Badge>
      </header>

      {/* KPI grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total students" value={data.totalStudents} />
        <StatCard icon={UserCheck} label="Present today" value={data.presentToday} tone="success" />
        <StatCard icon={UserX} label="Absent today" value={data.absentToday} tone="destructive" />
        <StatCard
          icon={data.attRateToday >= data.attRateY ? TrendingUp : TrendingDown}
          label="Attendance rate"
          value={`${data.attRateToday}%`}
          tone="primary"
          sub={
            trendDiff === 0
              ? "Same as yesterday"
              : `${trendDiff > 0 ? "+" : ""}${trendDiff}% vs yesterday`
          }
        />
      </div>

      {/* Not-marked alert */}
      {data.notMarked.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-warning" />
              <div>
                <div className="font-medium">{data.notMarked.length} {data.notMarked.length === 1 ? "class hasn't" : "classes haven't"} had attendance marked today</div>
                <div className="text-sm text-muted-foreground">{data.notMarked.map((c) => c.name).join(" · ")}</div>
              </div>
            </div>
            <Link to="/attendance">
              <button className="inline-flex items-center gap-1 rounded-md bg-warning px-3 py-1.5 text-sm font-medium text-warning-foreground">
                Mark now <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Trend + DoW */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Attendance trend</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
                  <Line type="monotone" dataKey="rate" stroke="var(--color-primary)" strokeWidth={2} dot={false} name="Attendance %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By day of week</CardTitle>
            <CardDescription>Absence rate (last 30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dowStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
                  <Bar dataKey="absenceRate" name="Absence %" radius={6}>
                    {data.dowStats.map((_, i) => (
                      <Cell key={i} fill="var(--color-chart-4)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Class leaderboard + at-risk */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Class leaderboard</CardTitle>
              <CardDescription>Attendance % this month</CardDescription>
            </div>
            <Award className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {data.classStats.length === 0 ? (
              <EmptyRow msg="No classes yet." to="/classes" cta="Create a class" />
            ) : (
              <ul className="space-y-3">
                {data.classStats.map((c, i) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <span className="w-6 text-sm text-muted-foreground">{i + 1}</span>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{c.name}</span>
                        <span className={cn(
                          "font-semibold",
                          c.pct >= data.threshold ? "text-success" : "text-destructive",
                        )}>{c.pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full", c.pct >= data.threshold ? "bg-success" : "bg-destructive")}
                          style={{ width: `${c.pct}%` }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>At-risk students</CardTitle>
              <CardDescription>Attendance below {data.threshold}%</CardDescription>
            </div>
            <AlertCircle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            {data.atRisk.length === 0 ? (
              <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                No at-risk students. 🎉
              </div>
            ) : (
              <ul className="space-y-2">
                {data.atRisk.slice(0, 8).map((s) => (
                  <li key={s.id}>
                    <Link
                      to="/students/$studentId"
                      params={{ studentId: s.id }}
                      className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm hover:bg-accent"
                    >
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">Roll {s.roll_no} · {s.days} days recorded</div>
                      </div>
                      <span className="font-semibold text-destructive">{s.pct}%</span>
                    </Link>
                  </li>
                ))}
                {data.atRisk.length > 8 && (
                  <div className="pt-2 text-center text-xs text-muted-foreground">+{data.atRisk.length - 8} more</div>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserX className="h-4 w-4 text-destructive" /> Absent today</CardTitle>
            <CardDescription>{data.absenteesToday.length} students</CardDescription>
          </CardHeader>
          <CardContent>
            {data.absenteesToday.length === 0 ? (
              <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                Full house! Or attendance not marked yet.
              </div>
            ) : (
              <ul className="max-h-72 space-y-1.5 overflow-auto">
                {data.absenteesToday.map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded border bg-background px-3 py-1.5 text-sm">
                    <span>{s.name}</span>
                    <span className="text-xs text-muted-foreground">#{s.roll_no}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Perfect attendance</CardTitle>
            <CardDescription>100% this month</CardDescription>
          </CardHeader>
          <CardContent>
            {data.perfectAttendance.length === 0 ? (
              <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">No perfect streaks yet.</div>
            ) : (
              <ul className="max-h-72 space-y-1.5 overflow-auto">
                {data.perfectAttendance.map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded border bg-background px-3 py-1.5 text-sm">
                    <span>{s.name}</span>
                    <span className="text-xs text-success">{s.days} days</span>
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

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  sub,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  tone?: "success" | "destructive" | "primary";
  sub?: string;
}) {
  const toneCls = tone === "success" ? "text-success bg-success/10" :
    tone === "destructive" ? "text-destructive bg-destructive/10" :
    tone === "primary" ? "text-primary bg-primary/10" :
    "text-foreground bg-muted";
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <div className={cn("grid h-11 w-11 place-items-center rounded-xl", toneCls)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyRow({ msg, to, cta }: { msg: string; to: string; cta: string }) {
  return (
    <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
      {msg}
      {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
      <div className="mt-2"><a href={to} className="text-primary underline">{cta}</a></div>
    </div>
  );
}
