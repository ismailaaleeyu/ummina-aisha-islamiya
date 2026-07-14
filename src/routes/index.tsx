import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  Users,
  CalendarDays,
  Wallet,
  BarChart3,
  ShieldCheck,
  GraduationCap,
  Bus,
  Library,
  MessagesSquare,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "Ummina Aisha School | Qur'anic Memorization & Islamic Civilization, Yola",
      },
      {
        name: "description",
        content:
          "The operational platform for Ummina Aisha School, Yola — manage students, teachers, attendance, exams, fees and communication in one place.",
      },
      {
        property: "og:title",
        content: "Ummina Aisha School — Management Platform",
      },
      {
        property: "og:description",
        content:
          "Book a demo of the modern school management system built for Ummina Aisha School, Yola.",
      },
    ],
  }),
  component: LandingPage,
});

const modules = [
  { icon: Users, title: "Students & Parents", desc: "Admissions, profiles, guardians." },
  { icon: GraduationCap, title: "Teachers & HR", desc: "Staff records, payroll, leave." },
  { icon: CalendarDays, title: "Attendance & Timetable", desc: "Daily marking, class schedules." },
  { icon: BookOpen, title: "Exams & Grading", desc: "Assessments, report cards." },
  { icon: Wallet, title: "Fees & Finance", desc: "Invoicing with Paystack." },
  { icon: Library, title: "Library & Assignments", desc: "Catalogue, borrowing, homework." },
  { icon: Bus, title: "Transport & Hostel", desc: "Routes, rooms, allocations." },
  { icon: MessagesSquare, title: "Communication", desc: "SMS, email, in-app alerts." },
  { icon: BarChart3, title: "Analytics", desc: "Live dashboards for leadership." },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              UA
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Ummina Aisha School</p>
              <p className="text-xs text-muted-foreground">Yola, Nigeria</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#modules" className="text-muted-foreground hover:text-foreground">Modules</a>
            <a href="#roles" className="text-muted-foreground hover:text-foreground">Roles</a>
            <a href="#cta" className="text-muted-foreground hover:text-foreground">Contact</a>
          </nav>
          <Link
            to="/auth"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/40 to-background pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Trusted school operations platform
          </span>
          <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Run <span className="text-primary">Ummina Aisha School</span>
            <br /> from one calm dashboard.
          </h1>
          <p className="mt-6 mx-auto max-w-2xl text-lg text-muted-foreground">
            A modern management system for Qur'anic memorization and Islamic
            civilization education — students, teachers, attendance, exams,
            fees, transport and communication in one place.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#cta"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Book a Demo Today <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#cta"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-6 py-3 text-sm font-semibold hover:bg-accent"
            >
              Request a Tour
            </a>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="mx-auto max-w-6xl px-4 py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight">
            Everything the school needs, nothing it doesn't
          </h2>
          <p className="mt-3 text-muted-foreground">
            Modular by design. Start with the core, roll out advanced modules
            as you grow.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <div
              key={m.title}
              className="rounded-xl border border-border bg-card p-5 transition hover:shadow-sm hover:border-primary/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <m.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{m.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="border-y border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-bold tracking-tight">Built for every role</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Nine role-based experiences — each person sees exactly what they need.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {[
              "Admin","Teacher","Student","Parent","Accountant",
              "Librarian","HR","Receptionist","Transport Manager",
            ].map((r) => (
              <span
                key={r}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm"
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
          Ready to see it in action?
        </h2>
        <p className="mt-3 text-muted-foreground">
          Book a live walkthrough with our team, or come tour the platform.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="mailto:demo@umminaaisha.school?subject=Book%20a%20Demo"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Book a Demo Today
          </a>
          <a
            href="mailto:tour@umminaaisha.school?subject=Request%20a%20Tour"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-6 py-3 text-sm font-semibold hover:bg-accent"
          >
            Request a Tour
          </a>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Ummina Aisha School, Yola.</p>
          <p>Qur'anic Memorization & Islamic Civilization</p>
        </div>
      </footer>
    </div>
  );
}
