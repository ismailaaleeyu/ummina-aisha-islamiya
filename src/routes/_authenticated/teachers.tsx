import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, ArrowLeft, Search, X } from "lucide-react";
import { ExcelImport, excelDate } from "@/components/ExcelImport";
import { AdminAccessDenied } from "@/components/AdminAccessDenied";
import { useAdminAccess } from "@/hooks/use-admin-access";


export const Route = createFileRoute("/_authenticated/teachers")({
  head: () => ({ meta: [{ title: "Teachers | Ummina Aisha School" }] }),
  component: TeachersPage,
});

type Teacher = {
  id: string;
  staff_no: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  specialization: string | null;
  qualifications: string | null;
  hire_date: string | null;
  status: string;
  notes: string | null;
};

const empty: Omit<Teacher, "id"> = {
  staff_no: "",
  full_name: "",
  email: "",
  phone: "",
  specialization: "",
  qualifications: "",
  hire_date: null,
  status: "active",
  notes: "",
};

function TeachersPage() {
  const { isAdmin, loading: accessLoading } = useAdminAccess();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState<Omit<Teacher, "id">>(empty);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("teachers")
      .select("*")
      .order("full_name", { ascending: true });
    setTeachers((data ?? []) as Teacher[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!accessLoading && isAdmin) void load();
  }, [accessLoading, isAdmin]);

  if (accessLoading || !isAdmin) {
    return <AdminAccessDenied loading={accessLoading} />;
  }

  function openNew() {
    setEditing(null);
    setForm(empty);
    setErr(null);
    setOpen(true);
  }

  function openEdit(t: Teacher) {
    setEditing(t);
    const { id: _id, ...rest } = t;
    void _id;
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
      email: form.email || null,
      phone: form.phone || null,
      specialization: form.specialization || null,
      qualifications: form.qualifications || null,
      hire_date: form.hire_date || null,
      notes: form.notes || null,
    };
    const res = editing
      ? await supabase.from("teachers").update(payload).eq("id", editing.id)
      : await supabase.from("teachers").insert(payload);
    if (res.error) {
      setErr(res.error.message);
      setSaving(false);
      return;
    }
    setOpen(false);
    setSaving(false);
    await load();
  }

  async function remove(t: Teacher) {
    if (!confirm(`Remove ${t.full_name}?`)) return;
    const { error } = await supabase.from("teachers").delete().eq("id", t.id);
    if (error) alert(error.message);
    else await load();
  }

  const filtered = teachers.filter((t) => {
    const s = q.toLowerCase();
    return (
      !s ||
      t.full_name.toLowerCase().includes(s) ||
      t.staff_no.toLowerCase().includes(s) ||
      (t.specialization ?? "").toLowerCase().includes(s)
    );
  });

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
          <div className="flex items-center gap-2">
            <ExcelImport
              table="teachers"
              entityLabel="Teachers"
              defaults={{ status: "active" }}
              onDone={load}
              fields={[
                { key: "staff_no", label: "Staff No", aliases: ["staff no", "staff_no", "staffno", "staff number"], required: true },
                { key: "full_name", label: "Full Name", aliases: ["full name", "name", "fullname"], required: true },
                { key: "email", label: "Email", aliases: ["email", "e-mail"] },
                { key: "phone", label: "Phone", aliases: ["phone", "phone number", "mobile"] },
                { key: "specialization", label: "Specialization", aliases: ["specialization", "subject"] },
                { key: "qualifications", label: "Qualifications", aliases: ["qualifications", "qualification"] },
                { key: "hire_date", label: "Hire Date", aliases: ["hire date", "hired", "date hired"], parse: (v) => excelDate(v) },
              ]}
            />
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Add teacher
            </button>
          </div>

        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teachers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage teaching staff, subjects and contact details.
          </p>
        </div>

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, staff no or subject"
            className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Staff No</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Specialization</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No teachers yet. Click "Add teacher" to get started.
                    </td>
                  </tr>
                ) : (
                  filtered.map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="px-4 py-3 font-mono text-xs">{t.staff_no}</td>
                      <td className="px-4 py-3 font-medium">{t.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {t.specialization ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{t.phone ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs capitalize ${
                            t.status === "active"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => openEdit(t)}
                            className="rounded-md p-2 hover:bg-accent"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => remove(t)}
                            className="rounded-md p-2 hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
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
            className="w-full max-w-lg rounded-xl border border-border bg-card p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editing ? "Edit teacher" : "Add teacher"}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Staff No *">
                <input
                  required
                  value={form.staff_no}
                  onChange={(e) => setForm({ ...form, staff_no: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Full name *">
                <input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Phone">
                <input
                  value={form.phone ?? ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Specialization">
                <input
                  value={form.specialization ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, specialization: e.target.value })
                  }
                  placeholder="e.g. Qur'an, Arabic, Mathematics"
                  className={inputCls}
                />
              </Field>
              <Field label="Hire date">
                <input
                  type="date"
                  value={form.hire_date ?? ""}
                  onChange={(e) => setForm({ ...form, hire_date: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Status" className="sm:col-span-2">
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className={inputCls}
                >
                  <option value="active">Active</option>
                  <option value="on_leave">On leave</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
              <Field label="Qualifications" className="sm:col-span-2">
                <textarea
                  rows={2}
                  value={form.qualifications ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, qualifications: e.target.value })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Notes" className="sm:col-span-2">
                <textarea
                  rows={2}
                  value={form.notes ?? ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>

            {err && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">
                {err}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent"
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
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary";

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
