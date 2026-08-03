import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, ArrowLeft, Search, X } from "lucide-react";
import { ExcelImport, excelDate } from "@/components/ExcelImport";


export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({ meta: [{ title: "Students | Ummina Aisha School" }] }),
  component: StudentsPage,
});

type ClassRow = { id: string; name: string; section: string | null };
type Student = {
  id: string;
  admission_no: string;
  full_name: string;
  gender: "male" | "female" | null;
  date_of_birth: string | null;
  class_id: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  address: string | null;
  status: "active" | "inactive" | "graduated" | "withdrawn";
};

const empty: Omit<Student, "id"> = {
  admission_no: "",
  full_name: "",
  gender: null,
  date_of_birth: null,
  class_id: null,
  guardian_name: "",
  guardian_phone: "",
  address: "",
  status: "active",
};

function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<Omit<Student, "id">>(empty);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase.from("students").select("*").order("created_at", { ascending: false }),
      supabase.from("classes").select("id,name,section").order("name"),
    ]);
    setStudents((s ?? []) as Student[]);
    setClasses((c ?? []) as ClassRow[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm(empty);
    setErr(null);
    setOpen(true);
  }
  function openEdit(s: Student) {
    setEditing(s);
    const { id: _id, ...rest } = s;
    setForm(rest);
    setErr(null);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const payload = {
      ...form,
      date_of_birth: form.date_of_birth || null,
      class_id: form.class_id || null,
      gender: form.gender || null,
    };
    const res = editing
      ? await supabase.from("students").update(payload).eq("id", editing.id)
      : await supabase.from("students").insert(payload);
    setSaving(false);
    if (res.error) { setErr(res.error.message); return; }
    setOpen(false);
    load();
  }

  async function remove(s: Student) {
    if (!confirm(`Delete ${s.full_name}? This cannot be undone.`)) return;
    const { error } = await supabase.from("students").delete().eq("id", s.id);
    if (error) { alert(error.message); return; }
    load();
  }

  const classLabel = (id: string | null) => {
    if (!id) return "—";
    const c = classes.find((x) => x.id === id);
    return c ? `${c.name}${c.section ? ` ${c.section}` : ""}` : "—";
  };

  const filtered = students.filter((s) => {
    if (!q) return true;
    const t = q.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(t) ||
      s.admission_no.toLowerCase().includes(t) ||
      (s.guardian_name ?? "").toLowerCase().includes(t)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <ExcelImport
              table="students"
              entityLabel="Students"
              defaults={{ status: "active" }}
              onDone={load}
              fields={[
                { key: "admission_no", label: "Admission No", aliases: ["admission no", "admission_no", "admissionno", "adm no"], required: true },
                { key: "full_name", label: "Full Name", aliases: ["full name", "name", "fullname"], required: true },
                { key: "gender", label: "Gender", aliases: ["gender", "sex"], parse: (v: string) => (v.toLowerCase().startsWith("f") ? "female" : v.toLowerCase().startsWith("m") ? "male" : null) },
                { key: "date_of_birth", label: "Date of Birth", aliases: ["date of birth", "dob", "birth date"], parse: (v: string) => excelDate(v) },
                { key: "class_id", label: "Class", aliases: ["class", "class name", "className"], parse: (v: string) => classes.find((c) => `${c.name}${c.section ? ` ${c.section}` : ""}`.toLowerCase() === v.toLowerCase() || c.name.toLowerCase() === v.toLowerCase())?.id ?? null },
                { key: "guardian_name", label: "Guardian Name", aliases: ["guardian name", "guardian", "parent name"] },
                { key: "guardian_phone", label: "Guardian Phone", aliases: ["guardian phone", "phone", "parent phone"] },
                { key: "address", label: "Address", aliases: ["address"] },
              ]}
            />
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> New student
            </button>
          </div>

        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the student roster — {students.length} on record.
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, admission no, or guardian…"
            className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Admission #</th>
                  <th className="px-4 py-3 font-medium">Full name</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Guardian</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {students.length === 0 ? "No students yet. Add your first student to get started." : "No matches."}
                  </td></tr>
                ) : filtered.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs">{s.admission_no}</td>
                    <td className="px-4 py-3 font-medium">{s.full_name}</td>
                    <td className="px-4 py-3">{classLabel(s.class_id)}</td>
                    <td className="px-4 py-3">
                      {s.guardian_name ?? "—"}
                      {s.guardian_phone ? <div className="text-xs text-muted-foreground">{s.guardian_phone}</div> : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs capitalize text-primary">
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(s)} className="rounded-md border border-border p-1.5 hover:bg-accent" aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(s)} className="rounded-md border border-border p-1.5 hover:bg-destructive hover:text-destructive-foreground" aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {classes.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
            No classes yet. Head to <Link to="/classes" className="text-primary underline">Classes</Link> to create some first.
          </div>
        )}
      </main>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold">{editing ? "Edit student" : "New student"}</h2>
              <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={save} className="px-6 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Admission #" required>
                  <input required value={form.admission_no} onChange={(e) => setForm({ ...form, admission_no: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Status">
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Student["status"] })} className={inputCls}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="graduated">Graduated</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>
                </Field>
              </div>
              <Field label="Full name" required>
                <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Gender">
                  <select value={form.gender ?? ""} onChange={(e) => setForm({ ...form, gender: (e.target.value || null) as Student["gender"] })} className={inputCls}>
                    <option value="">—</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </Field>
                <Field label="Date of birth">
                  <input type="date" value={form.date_of_birth ?? ""} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value || null })} className={inputCls} />
                </Field>
              </div>
              <Field label="Class">
                <select value={form.class_id ?? ""} onChange={(e) => setForm({ ...form, class_id: e.target.value || null })} className={inputCls}>
                  <option value="">Unassigned</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ""}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Guardian name">
                  <input value={form.guardian_name ?? ""} onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Guardian phone">
                  <input value={form.guardian_phone ?? ""} onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} className={inputCls} />
                </Field>
              </div>
              <Field label="Address">
                <textarea rows={2} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} />
              </Field>

              {err && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{err}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  {saving ? "Saving…" : editing ? "Save changes" : "Create student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}
