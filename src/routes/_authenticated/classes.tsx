import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, ArrowLeft, X } from "lucide-react";
import { AdminAccessDenied } from "@/components/AdminAccessDenied";
import { useAdminAccess } from "@/hooks/use-admin-access";

export const Route = createFileRoute("/_authenticated/classes")({
  head: () => ({ meta: [{ title: "Classes | Ummina Aisha School" }] }),
  component: ClassesPage,
});

type ClassRow = {
  id: string;
  name: string;
  level: string | null;
  section: string | null;
};

const empty = { name: "", level: "", section: "" };

function ClassesPage() {
  const { isAdmin, loading: accessLoading } = useAdminAccess();
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRow | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("classes").select("*").order("name");
    setRows((data ?? []) as ClassRow[]);
    const { data: s } = await supabase.from("students").select("class_id");
    const map: Record<string, number> = {};
    (s ?? []).forEach((r: { class_id: string | null }) => {
      if (r.class_id) map[r.class_id] = (map[r.class_id] ?? 0) + 1;
    });
    setCounts(map);
    setLoading(false);
  }
  useEffect(() => {
    if (!accessLoading && isAdmin) void load();
  }, [accessLoading, isAdmin]);

  if (accessLoading || !isAdmin) {
    return <AdminAccessDenied loading={accessLoading} />;
  }

  function openNew() { setEditing(null); setForm(empty); setErr(null); setOpen(true); }
  function openEdit(c: ClassRow) {
    setEditing(c);
    setForm({ name: c.name, level: c.level ?? "", section: c.section ?? "" });
    setErr(null); setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    const payload = { name: form.name, level: form.level || null, section: form.section || null };
    const res = editing
      ? await supabase.from("classes").update(payload).eq("id", editing.id)
      : await supabase.from("classes").insert(payload);
    setSaving(false);
    if (res.error) { setErr(res.error.message); return; }
    setOpen(false); load();
  }

  async function remove(c: ClassRow) {
    if (!confirm(`Delete class "${c.name}"?`)) return;
    const { error } = await supabase.from("classes").delete().eq("id", c.id);
    if (error) { alert(error.message); return; }
    load();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <button onClick={openNew} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> New class
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Classes</h1>
          <p className="text-sm text-muted-foreground mt-1">{rows.length} class{rows.length === 1 ? "" : "es"} defined.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No classes yet. Create your first class to start assigning students.
            </div>
          ) : rows.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{c.name}{c.section ? <span className="text-muted-foreground"> · {c.section}</span> : null}</p>
                  {c.level && <p className="text-xs text-muted-foreground mt-0.5">{c.level}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="rounded-md border border-border p-1.5 hover:bg-accent" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => remove(c)} className="rounded-md border border-border p-1.5 hover:bg-destructive hover:text-destructive-foreground" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{counts[c.id] ?? 0} student{counts[c.id] === 1 ? "" : "s"}</p>
            </div>
          ))}
        </div>
      </main>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold">{editing ? "Edit class" : "New class"}</h2>
              <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={save} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name <span className="text-destructive">*</span></label>
                <input required placeholder="e.g. JSS 1, Hifz Level 2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Level</label>
                  <input placeholder="Primary / Secondary / Hifz" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Section</label>
                  <input placeholder="A, B, Boys, Girls…" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              {err && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{err}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  {saving ? "Saving…" : editing ? "Save" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
