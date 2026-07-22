import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Users, BarChart3, Calendar, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">A</div>
          <span className="font-display text-xl font-semibold">Attendly</span>
        </div>
        <Link to="/auth"><Button variant="outline">Sign in</Button></Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <section className="grid gap-10 py-16 md:grid-cols-2 md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-success" /> Built for real classrooms
            </div>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-tight md:text-6xl">
              Attendance,<br /> without the paperwork.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Mark a whole batch present in one tap. See who's here, who's not, and who's slipping — across every class, every day.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth"><Button size="lg" className="h-12 px-6">Get started</Button></Link>
              <Link to="/auth"><Button size="lg" variant="outline" className="h-12 px-6">I'm a teacher</Button></Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">First person to sign up becomes the admin.</p>
          </div>

          <div className="relative">
            <div className="rounded-2xl border bg-card p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Today</div>
                  <div className="font-display text-2xl font-semibold">Grade 10 · Morning</div>
                </div>
                <div className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">28 of 32 present</div>
              </div>
              <div className="space-y-2">
                {[
                  { n: "Aarav Sharma", p: true },
                  { n: "Priya Nair", p: true },
                  { n: "Rohan Kapoor", p: false },
                  { n: "Meera Iyer", p: true },
                ].map((s) => (
                  <div key={s.n} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm">
                    <span>{s.n}</span>
                    <span className={s.p ? "text-success font-medium" : "text-destructive font-medium"}>
                      {s.p ? "Present" : "Absent"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 py-10 md:grid-cols-4">
          {[
            { icon: CheckCircle2, t: "One-tap attendance", d: "Bulk mark present, flip absentees." },
            { icon: Users, t: "Roles & access", d: "Admins run the show, teachers own their classes." },
            { icon: BarChart3, t: "Full-picture dashboard", d: "Trends, at-risk students, class health." },
            { icon: Calendar, t: "Export any range", d: "Monthly, custom, or per student — CSV." },
          ].map((f) => (
            <div key={f.t} className="rounded-xl border bg-card p-5">
              <f.icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-semibold">{f.t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{f.d}</div>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border bg-primary p-8 text-primary-foreground">
          <div className="flex items-center gap-2 text-xs opacity-80"><ShieldCheck className="h-4 w-4" /> Secure by default</div>
          <h2 className="mt-2 font-display text-3xl">Every teacher only sees their own classes.</h2>
          <p className="mt-2 max-w-2xl opacity-90">Row-level security means data stays scoped. Admins see everything; teachers see what they're assigned.</p>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Attendly
        </div>
      </footer>
    </div>
  );
}
