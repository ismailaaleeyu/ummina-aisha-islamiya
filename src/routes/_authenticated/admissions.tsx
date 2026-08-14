import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Search,
  X,
  UserPlus,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admissions")({
  head: () => ({
    meta: [
      { title: "Admissions | Ummina Aisha School" },
      {
        name: "description",
        content:
          "Track admission applications from enquiry to enrolment: applicant records, review status, and one-click enrolment.",
      },
      { property: "og:title", content: "Admissions | Ummina Aisha School" },
      {
        property: "og:description",
        content:
          "Manage the admissions pipeline: applied, reviewed, interviewed, admitted, rejected and enrolled.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdmissionsPage,
});

const STATUSES = [
  "applied",
  "reviewed",
  "interviewed",
  "admitted",
  "rejected",
  "enrolled",
] as const;

type Applicant = {
  id: string;
  application_no: string;
  full_name: string;
  gender: string | null;
  date_of_birth: string | null;
  desired_class_id: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  address: string | null;
  previous_school: string | null;
  notes: string | null;
  application_date: string;
  status: string;
  decision_notes: string | null;
  student_id: string | null;
  classes?: { name: string } | null;
};

type ClassRow = { id: string; name: string };

const emptyForm = {
  application_no: "",
  full_name: "",
  gender: "",
  date_of_birth: "",
  desired_class_id: "",
  guardian_name: "",
  guardian_phone: "",
  guardian_email: "",
  address: "",
  previous_school: "",
  notes: "",
  application_date: new Date().toISOString().slice(0, 10),
  status: "applied",
  decision_notes: "",
};

function AdmissionsPage() {
  const [roles, setRoles] = useState<string[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Applicant | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canManage = useMemo(
    () =>
      roles.includes("admin") ||
      roles.includes("receptionist") ||
      roles.includes("hr"),
    [roles]
  );

  async function loadRoles() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    setRoles(((data ?? []) as { role: string }[]).map((r) => r.role));
  }

  async function loadApplicants() {
    const { data } = await supabase
      .from("applicants")
      .select("*, classes:desired_class_id(name)")
      .order("application_date", { ascending: false });
    setApplicants((data ?? []) as Applicant[]);
  }

  async function loadClasses() {
    const { data } = await supabase
      .from("classes")
      .select("id, name")
      .order("name", { ascending: true });
    setClasses((data ?? []) as ClassRow[]);
  }

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadRoles(), loadApplicants(), loadClasses()]);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function nextApplicationNo() {
    const year = new Date().getFullYear();
    const n = applicants.length + 1;
    return `APP/${year}/${String(n).padStart(4, "0")}`;
  }

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm, application_no: nextApplicationNo() });
    setErr(null);
    setOpen(true);
  }

  function openEdit(a: Applicant) {
    setEditing(a);
    setForm({
      application_no: a.application_no,
      full_name: a.full_name,
      gender: a.gender ?? "",
      date_of_birth: a.date_of_birth ?? "",
      desired_class_id: a.desired_class_id ?? "",
      guardian_name: a.guardian_name ?? "",
      guardian_phone: a.guardian_phone ?? "",
      guardian_email: a.guardian_email ?? "",
      address: a.address ?? "",
      previous_school: a.previous_school ?? "",
      notes: a.notes ?? "",
      application_date: a.application_date,
      status: a.status,
      decision_notes: a.decision_notes ?? "",
    });
    setErr(null);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const payload = {
      application_no: form.application_no,
      full_name: form.full_name,
      gender: form.gender || null,
      date_of_birth: form.date_of_birth || null,
      desired_class_id: form.desired_class_id || null,
      guardian_name: form.guardian_name || null,
      guardian_phone: form.guardian_phone || null,
      guardian_email: form.guardian_email || null,
      address: form.address || null,
      previous_school: form.previous_school || null,
      notes: form.notes || null,
      application_date: form.application_date,
      status: form.status,
      decision_notes: form.decision_notes || null,
    };
    const res = editing
      ? await supabase.from("applicants").update(payload).eq("id", editing.id)
      : await supabase.from("applicants").insert(payload);
    if (res.error) {
      setErr(res.error.message);
      setSaving(false);
      return;
    }
    setOpen(false);
    setSaving(false);
    await loadApplicants();
  }

  async function remove(a: Applicant) {
    if (!confirm(`Delete application for ${a.full_name}?`)) return;
    const { error } = await supabase.from("applicants").delete().eq("id", a.id);
    if (error) alert(error.message);
    else await loadApplicants();
  }

  async function setStatus(a: Applicant, status: string) {
    setBusyId(a.id);
    const { error } = await supabase
      .from("applicants")
      .update({ status })
      .eq("id", a.id);
    setBusyId(null);
    if (error) alert(error.message);
    else await loadApplicants();
  }

  async function enroll(a: Applicant) {
    if (a.student_id) {
      alert("This applicant has already been enrolled.");
      return;
    }
    if (!confirm(`Enrol ${a.full_name} as a student?`)) return;
    setBusyId(a.id);
    const admissionNo = a.application_no.replace(/^APP/, "ADM");
    const { data: student, error } = await supabase
      .from("students")
      .insert({
        admission_no: admissionNo,
        full_name: a.full_name,
        gender: a.gender,
        date_of_birth: a.date_of_birth,
        class_id: a.desired_class_id,
        guardian_name: a.guardian_name,
        guardian_phone: a.guardian_phone,
        address: a.address,
        status: "active",
      })
      .select("id")
      .maybeSingle();
    if (error || !student) {
      setBusyId(null);
      alert(error?.message ?? "Could not create the student record.");
      return;
    }
    const { error: updErr } = await supabase
      .from("applicants")
      .update({ status: "enrolled", student_id: student.id })
      .eq("id", a.id);
    setBusyId(null);
    if (updErr) alert(updErr.message);
    await loadApplicants();
  }

  const filtered = applicants.filter((a) => {
    const term = q.toLowerCase();
    const matchesTerm =
      !term ||
      a.full_name.toLowerCase().includes(term) ||
      a.application_no.toLowerCase().includes(term) ||
      (a.guardian_name ?? "").toLowerCase().includes(term) ||
      (a.guardian_phone ?? "").toLowerCase().includes(term);
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesTerm && matchesStatus;
  });

  const counts = STATUSES.map((s) => ({
    status: s,
    count: applicants.filter((a) => a.status === s).length,
  }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          {canManage && (
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> New application
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admissions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track applications from enquiry through to enrolment.
          </p>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {counts.map((c) => (
            <button
              key={c.status}
              onClick={() =>
                setStatusFilter(statusFilter === c.status ? "all" : c.status)
              }
              className={`rounded-xl border bg-card p-4 text-left transition ${
                statusFilter === c.status
                  ? "border-primary shadow-sm"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <p className="text-xs capitalize text-muted-foreground">
                {c.status}
              </p>
              <p className="mt-1 text-xl font-semibold">{c.count}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, application no or guardian"
              className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={inputCls + " w-auto"}
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Application</th>
                  <th className="px-4 py-3 font-medium">Applicant</th>
                  <th className="px-4 py-3 font-medium">Desired class</th>
                  <th className="px-4 py-3 font-medium">Guardian</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  {canManage && (
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={canManage ? 6 : 5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canManage ? 6 : 5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No applications found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs">{a.application_no}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.application_date}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{a.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.gender ?? "—"}
                          {a.date_of_birth ? ` · ${a.date_of_birth}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {a.classes?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <p>{a.guardian_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.guardian_phone ?? ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <select
                            value={a.status}
                            disabled={busyId === a.id || a.status === "enrolled"}
                            onChange={(e) => setStatus(a, e.target.value)}
                            className="rounded-md border border-input bg-background px-2 py-1 text-xs capitalize outline-none focus:border-primary disabled:opacity-60"
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <StatusBadge status={a.status} />
                        )}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex gap-1">
                            {a.status === "admitted" && !a.student_id && (
                              <button
                                onClick={() => enroll(a)}
                                disabled={busyId === a.id}
                                className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                              >
                                <UserPlus className="h-3.5 w-3.5" /> Enrol
                              </button>
                            )}
                            {a.student_id && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1.5 text-xs text-primary">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Enrolled
                              </span>
                            )}
                            <button
                              onClick={() => openEdit(a)}
                              className="rounded-md p-2 hover:bg-accent"
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => remove(a)}
                              className="rounded-md p-2 hover:bg-destructive/10 hover:text-destructive"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={save}
            className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editing ? "Edit application" : "New application"}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 hover:bg-accent"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {err && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {err}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Application no">
                <input
                  required
                  value={form.application_no}
                  onChange={(e) =>
                    setForm({ ...form, application_no: e.target.value })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Application date">
                <input
                  type="date"
                  required
                  value={form.application_date}
                  onChange={(e) =>
                    setForm({ ...form, application_date: e.target.value })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Full name" className="sm:col-span-2">
                <input
                  required
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Gender">
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className={inputCls}
                >
                  <option value="">—</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </Field>
              <Field label="Date of birth">
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) =>
                    setForm({ ...form, date_of_birth: e.target.value })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Desired class">
                <select
                  value={form.desired_class_id}
                  onChange={(e) =>
                    setForm({ ...form, desired_class_id: e.target.value })
                  }
                  className={inputCls}
                >
                  <option value="">—</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className={inputCls}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Guardian name">
                <input
                  value={form.guardian_name}
                  onChange={(e) =>
                    setForm({ ...form, guardian_name: e.target.value })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Guardian phone">
                <input
                  value={form.guardian_phone}
                  onChange={(e) =>
                    setForm({ ...form, guardian_phone: e.target.value })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Guardian email">
                <input
                  type="email"
                  value={form.guardian_email}
                  onChange={(e) =>
                    setForm({ ...form, guardian_email: e.target.value })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Previous school">
                <input
                  value={form.previous_school}
                  onChange={(e) =>
                    setForm({ ...form, previous_school: e.target.value })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Notes" className="sm:col-span-2">
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Decision notes" className="sm:col-span-2">
                <textarea
                  rows={2}
                  value={form.decision_notes}
                  onChange={(e) =>
                    setForm({ ...form, decision_notes: e.target.value })
                  }
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "enrolled" || status === "admitted"
      ? "bg-primary/10 text-primary"
      : status === "applied"
      ? "bg-yellow-500/10 text-yellow-600"
      : status === "reviewed" || status === "interviewed"
      ? "bg-blue-500/10 text-blue-600"
      : "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs capitalize ${style}`}
    >
      {status}
    </span>
  );
}
