import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  CheckSquare,
  UserCog,
  FileBarChart,
  LogOut,
  Menu,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useCurrentUser } from "@/lib/auth-hooks";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/attendance", label: "Take Attendance", icon: CheckSquare },
  { to: "/classes", label: "Classes", icon: BookOpen },
  { to: "/students", label: "Students", icon: Users },
  { to: "/teachers", label: "Teachers", icon: UserCog, adminOnly: true },
  { to: "/reports", label: "Reports", icon: FileBarChart },
];

function NavList({ isAdmin, onClick }: { isAdmin: boolean; onClick?: () => void }) {
  const location = useLocation();
  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.filter((n) => !n.adminOnly || isAdmin).map((n) => {
        const active = location.pathname.startsWith(n.to);
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent",
            )}
          >
            <n.icon className="h-4 w-4" />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = me?.isAdmin ?? false;

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r bg-sidebar md:block">
          <div className="flex h-16 items-center gap-2 border-b px-5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">A</div>
            <span className="font-display text-lg font-semibold">Attendly</span>
          </div>
          <NavList isAdmin={isAdmin} />
          <div className="mt-auto border-t p-3">
            <div className="mb-2 rounded-lg bg-sidebar-accent px-3 py-2">
              <div className="text-xs text-muted-foreground">Signed in as</div>
              <div className="truncate text-sm font-medium">{me?.profile?.full_name || me?.user.email}</div>
              <div className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary uppercase tracking-wider">
                {isAdmin ? "Admin" : "Teacher"}
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </aside>

        <div className="flex-1">
          {/* Mobile top bar */}
          <header className="flex h-14 items-center justify-between border-b px-4 md:hidden">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground text-xs font-bold">A</div>
              <span className="font-display font-semibold">Attendly</span>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex h-16 items-center gap-2 border-b px-5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">A</div>
                  <span className="font-display text-lg font-semibold">Attendly</span>
                </div>
                <NavList isAdmin={isAdmin} />
                <div className="p-3">
                  <Button variant="outline" className="w-full" onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </header>

          <main className="mx-auto max-w-7xl p-4 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
