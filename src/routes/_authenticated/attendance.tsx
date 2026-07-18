import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({ meta: [{ title: "Attendance | Ummina Aisha School" }] }),
  component: AttendancePage,
});

type ClassRow = { id: string; name: string; section: string | null };
type StudentRow = { id: string; full_name: string; admission_no: string; class_id: string | null };
type Status = "present" | "absent" | "late" | "excused";
type AttRow = { id: string; student_id: string; status: Status; note: string | null };

const STATUSES: { key: Status; label: string; cls: string }[] = [
  { key: "present", label: "P", cls: "bg-primary text-primary-foreground" },
  { key: "absent", label: "A", cls: "bg-destructive text-destructive-foreground" },
  { key: "late", label: "L", cls: "bg-amber-500 text-white" },
  { key: "excused", label: "E", cls: "bg-secondary text-secondary-foreground" },
];

function AttendancePage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [existing, setExisting] = useState<Record<string, AttRow>>({});
  const [draft, setDraft] = useState<Record<string, { status: Status; note: string }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("classes").select("id,name,section").order("name");
      setClasses((c ?? []) as ClassRow[]);
      if (c && c.length && !classId) setClassId(c[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!classId) return;
    (async () => {
      setLoading(true); setSaved(false); setErr(null);
      const [{ data: s }, { data: a }] = await Promise.all([
        supabase.from("students").select("id,full_name,admission_no,class_id").eq("class_id", classId).eq("status", "active").order("full_name"),
        supabase.from("attendance").select("id,student_id,status,note").eq("class_id", classId).eq("date", date),
      ]);
      const studs = (s ?? []) as StudentRow[];
      const existingMap: Record<string, AttRow> = {};
      (a ?? []).forEach((r) => { existingMap[(r as AttRow).student_id] = r as AttRow; });
      const d: Record<string, { status: Status; note: string }> = {};
      studs.forEach((st) => {
        const e = existingMap[st.id];
        d[st.id] = { status: e?.status ?? "present", note: e?.note ?? "" };
      });
      setStudents(studs);
      setExisting(existingMap);
      setDraft(d);
      setLoading(false);
    })();
  }, [classId, date]);

  function setStatus(sid: string, status: Status) {
    setSaved(false);
    setDraft((d) => ({ ...d, [sid]: { ...d[sid], status } }));
  }
  function setNote(sid: string, note: string) {
    setSaved(false);
    setDraft((d) => ({ ...d, [sid]: { ...d[sid], note } }));
  }
  function markAll(status: Status) {
    setSaved(false);
    setDraft((d) => {
      const next = { ...d };
      Object.keys(next).forEach((k) => { next[k] = { ...next[k], status }; });
      return next;
    });
  }

  async function saveAll() {
    setSaving(true); setErr(null);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;
    const rows = students.map((s) => ({
      student_id: s.id,
      class_id: classId,
      date,
      status: draft[s.id].status,
      note: draft[s.id].note || null,
      recorded_by: uid,
    }));
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,date" });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setSaved(true);
  }

  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0 } as Record<Status, number>;
    Object.values(draft).forEach((v) => { counts[v.status]++; });
    return counts;
  }, [draft]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <button
            onClick={saveAll}
            disabled={saving || !students.length}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving…" : saved ? "Saved" : "Save register"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-1">Mark daily attendance per class. One entry per student per day.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">Class</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {classes.length === 0 && <option value="">No classes</option>}
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={() => markAll("present")} className="rounded-md border border-border px-3 py-2 text-xs hover:bg-accent">Mark all present</button>
            <button onClick={() => markAll("absent")} className="rounded-md border border-border px-3 py-2 text-xs hover:bg-accent">All absent</button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {STATUSES.map((s) => (
            <div key={s.key} className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground capitalize">{s.key}</p>
              <p className="text-xl font-semibold mt-1">{summary[s.key]}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Admission #</th>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
                ) : !classId ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Create a class first in <Link to="/classes" className="text-primary underline">Classes</Link>.</td></tr>
                ) : students.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No active students in this class.</td></tr>
                ) : students.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs">{s.admission_no}</td>
                    <td className="px-4 py-3 font-medium">{s.full_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {STATUSES.map((st) => {
                          const active = draft[s.id]?.status === st.key;
                          return (
                            <button
                              key={st.key}
                              onClick={() => setStatus(s.id, st.key)}
                              title={st.key}
                              className={`h-8 w-8 rounded-md text-xs font-semibold border transition ${active ? st.cls + " border-transparent" : "border-border bg-background hover:bg-accent"}`}
                            >
                              {st.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={draft[s.id]?.note ?? ""}
                        onChange={(e) => setNote(s.id, e.target.value)}
                        placeholder="Optional note"
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {err && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{err}</p>}
        {Object.keys(existing).length > 0 && (
          <p className="text-xs text-muted-foreground">{Object.keys(existing).length} existing record(s) for this date will be updated on save.</p>
        )}
      </main>
    </div>
  );
}
