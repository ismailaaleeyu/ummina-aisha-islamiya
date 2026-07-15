import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, GraduationCap, CalendarDays, Wallet, BookOpen,
  Library, Bus, MessagesSquare, BarChart3, LogOut, Settings,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard | Ummina Aisha School" }],
  }),
  component: Dashboard,
});

type Profile = { full_name: string | null };
type RoleRow = { role: string };

function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      setEmail(userData.user.email ?? "");
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", userData.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userData.user.id),
      ]);
      setProfile(p as Profile | null);
      setRoles(((r ?? []) as RoleRow[]).map((x) => x.role));
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const stats = [
    { icon: Users, label: "Students", value: "—" },
    { icon: GraduationCap, label: "Teachers", value: "—" },
    { icon: CalendarDays, label: "Today's Attendance", value: "—" },
    { icon: Wallet, label: "Outstanding Fees", value: "₦—" },
  ];

  const modules = [
    { icon: Users, name: "Students", to: "/students" as const, ready: true },
    { icon: BookOpen, name: "Classes", to: "/classes" as const, ready: true },
    { icon: GraduationCap, name: "Teachers", to: null, ready: false },
    { icon: CalendarDays, name: "Attendance", to: null, ready: false },
    { icon: BookOpen, name: "Exams", to: null, ready: false },
    { icon: Wallet, name: "Finance", to: null, ready: false },
    { icon: Library, name: "Library", to: null, ready: false },
    { icon: Bus, name: "Transport", to: null, ready: false },
    { icon: MessagesSquare, name: "Communication", to: null, ready: false },
    { icon: BarChart3, name: "Reports", to: null, ready: false },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              UA
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Ummina Aisha School</p>
              <p className="text-xs text-muted-foreground">Management Console</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium">{profile?.full_name ?? email}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {roles.length ? roles.join(", ").replace(/_/g, " ") : "—"}
              </p>
            </div>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Assalāmu ʿalaikum{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's what's happening across the school today.
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-2xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Modules grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Modules</h2>
            <button className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <Settings className="h-4 w-4" /> Configure
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {modules.map((m) => {
              const inner = (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground group-hover:bg-primary group-hover:text-primary-foreground transition">
                    <m.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.ready ? "Open" : "Coming soon"}</p>
                  </div>
                </>
              );
              const cls = "group flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/50 hover:shadow-sm";
              return m.to ? (
                <Link key={m.name} to={m.to} className={cls}>{inner}</Link>
              ) : (
                <button key={m.name} className={cls + " opacity-70 cursor-not-allowed"}>{inner}</button>
              );
            })}
          </div>
        </section>

        <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Next up</p>
          Students, Teachers, Classes and Attendance modules will be wired in the next iteration.
          Paystack integration will be added when configuring the Finance module — you'll need
          your Paystack secret & public keys ready.
        </div>
      </main>
    </div>
  );
}
