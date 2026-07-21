import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import { ArrowLeft } from "lucide-react";
import { getReports } from "@/lib/reports.functions";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports & Analytics | Ummina Aisha School" }] }),
  component: ReportsPage,
});

const COLORS = ["#7cc47a", "#f4c95d", "#e57373", "#64b5f6", "#ba68c8", "#4db6ac"];

function fmtNaira(n: number) {
  return "₦" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function ReportsPage() {
  const fn = useServerFn(getReports);
  const { data, isLoading, error } = useQuery({
    queryKey: ["reports"],
    queryFn: () => fn(),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <h1 className="ml-2 text-lg font-semibold">Reports & Analytics</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {isLoading && <p className="text-muted-foreground">Loading analytics…</p>}
        {error && <p className="text-destructive text-sm">{(error as Error).message}</p>}

        {data && (
          <>
            {/* KPI cards */}
            <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: "Students", value: data.totals.students },
                { label: "Teachers", value: data.totals.teachers },
                { label: "Classes", value: data.totals.classes },
                { label: "Subjects", value: data.totals.subjects },
              ].map((k) => (
                <div key={k.label} className="rounded-xl border bg-card p-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
                  <p className="mt-1 text-3xl font-bold">{k.value}</p>
                </div>
              ))}
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border bg-card p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Billed</p>
                <p className="mt-1 text-2xl font-bold">{fmtNaira(data.finance.billed)}</p>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Collected</p>
                <p className="mt-1 text-2xl font-bold text-primary">{fmtNaira(data.finance.collected)}</p>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding</p>
                <p className="mt-1 text-2xl font-bold text-destructive">{fmtNaira(data.finance.outstanding)}</p>
              </div>
            </section>

            {/* Enrollment by class */}
            <section className="rounded-xl border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold">Enrollment by class</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.classCounts}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis allowDecimals={false} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="students" fill="#7cc47a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Attendance */}
            <section className="rounded-xl border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold">Attendance rate — last 30 days</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.attendanceDaily}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis unit="%" domain={[0, 100]} fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="rate" stroke="#7cc47a" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Finance monthly & invoice status */}
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border bg-card p-5">
                <h2 className="mb-4 text-sm font-semibold">Fees — billed vs collected (last 6 months)</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.finance.monthly}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip formatter={(v: any) => fmtNaira(Number(v))} />
                      <Legend />
                      <Bar dataKey="billed" fill="#f4c95d" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="collected" fill="#7cc47a" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <h2 className="mb-4 text-sm font-semibold">Invoice status</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.finance.invoiceStatus} dataKey="value" nameKey="name" outerRadius={90} label>
                        {data.finance.invoiceStatus.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* Exams */}
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border bg-card p-5">
                <h2 className="mb-4 text-sm font-semibold">Exam averages (%)</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.examAvg}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="title" fontSize={11} />
                      <YAxis domain={[0, 100]} fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="average" fill="#64b5f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <h2 className="mb-4 text-sm font-semibold">Grade distribution</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.gradeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="grade" fontSize={12} />
                      <YAxis allowDecimals={false} fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#ba68c8" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
