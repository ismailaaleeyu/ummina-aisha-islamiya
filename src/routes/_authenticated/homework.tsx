import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Trash2, Save, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/homework")({
  head: () => ({ meta: [{ title: "Assignments & Homework | Ummina Aisha School" }] }),
  component: HomeworkPage,
});

type ClassRow = { id: string; name: string; section: string | null };
type SubjectRow = { id: string; name: string; class_id: string | null };
type TeacherRow = { id: string; full_name: string };
type AssignmentRow = {
  id: string;
  title: string;
  instructions: string | null;
  subject_id: string | null;
  class_id: string;
  teacher_id: string | null;
  assigned_date: string;
  due_date: string | null;
  max_score: number;
};
type StudentRow = { id: string; full_name: string; admission_no: string; class_id: string | null };
type SubmissionRow = {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string | null;
  submitted_at: string | null;
  status: "pending" | "submitted" | "late" | "graded";
  score: number | null;
  feedback: string | null;
};

type Tab = "assignments" | "submissions";

const STATUS_CLS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  submitted: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  late: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  graded: "bg-primary/15 text-primary",
};

function HomeworkPage() {
  const [tab, setTab] = useState<Tab>("assignments");
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [subCounts, setSubCounts] = useState<Record<string, number>>({});

  async function refresh() {
    const [{ data: c }, { data: s }, { data: t }, { data: a }, { data: subs }] = await Promise.all([
      supabase.from("classes").select("id,name,section").order("name"),
      supabase.from("subjects").select("id,name,class_id").order("name"),
      supabase.from("teachers").select("id,full_name").order("full_name"),
      supabase.from("assignments").select("id,title,instructions,subject_id,class_id,teacher_id,assigned_date,due_date,max_score").order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("assignment_submissions").select("assignment_id,status"),
    ]);
    setClasses((c ?? []) as ClassRow[]);
    setSubjects((s ?? []) as SubjectRow[]);
    setTeachers((t ?? []) as TeacherRow[]);
    setAssignments((a ?? []) as AssignmentRow[]);
    const counts: Record<string, number> = {};
    (subs ?? []).forEach((r) => {
      const row = r as { assignment_id: string; status: string };
      if (row.status === "submitted" || row.status === "late" || row.status === "graded") {
        counts[row.assignment_id] = (counts[row.assignment_id] ?? 0) + 1;
      }
    });
    setSubCounts(counts);
  }
  useEffect(() => { refresh(); }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
            {(["assignments", "submissions"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                  tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "submissions" ? "Mark & grade" : t}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assignments & Homework</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Post homework per class, then track and grade student submissions.
          </p>
        </div>

        {tab === "assignments" && (
          <AssignmentsTab
            assignments={assignments}
            classes={classes}
            subjects={subjects}
            teachers={teachers}
            subCounts={subCounts}
            onChange={refresh}
          />
        )}
        {tab === "submissions" && (
          <SubmissionsTab assignments={assignments} classes={classes} subjects={subjects} onChange={refresh} />
        )}
      </main>
    </div>
  );
}

/* ---------------- ASSIGNMENTS ---------------- */

function AssignmentsTab({
  assignments,
  classes,
  subjects,
  teachers,
  subCounts,
  onChange,
}: {
  assignments: AssignmentRow[];
  classes: ClassRow[];
  subjects: SubjectRow[];
  teachers: TeacherRow[];
  subCounts: Record<string, number>;
  onChange: () => void;
}) {
  const [form, setForm] = useState({
    title: "", instructions: "", subject_id: "", class_id: "", teacher_id: "", due_date: "", max_score: "100",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const classSubjects = useMemo(
    () => subjects.filter((s) => !form.class_id || !s.class_id || s.class_id === form.class_id),
    [subjects, form.class_id]
  );

  async function add() {
    if (!form.title.trim() || !form.class_id) { setErr("Title and class are required."); return; }
    setSaving(true); setErr(null);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("assignments").insert({
      title: form.title.trim(),
      instructions: form.instructions || null,
      subject_id: form.subject_id || null,
      class_id: form.class_id,
      teacher_id: form.teacher_id || null,
      due_date: form.due_date || null,
      max_score: Number(form.max_score) || 100,
      created_by: u.user?.id ?? null,
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setForm({ title: "", instructions: "", subject_id: "", class_id: "", teacher_id: "", due_date: "", max_score: "100" });
    onChange();
  }

  async function remove(id: string) {
    if (!confirm("Delete this assignment and all its submissions?")) return;
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (error) { alert(error.message); return; }
    onChange();
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold">New assignment</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input className="rounded-md border border-input bg-background px-3 py-2 text-sm lg:col-span-2" placeholder="Title (e.g. Memorise Surah Al-Mulk 1–10)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
            <option value="">Class *</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ""}</option>)}
          </select>
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}>
            <option value="">Subject (opt.)</option>
            {classSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}>
            <option value="">Teacher (opt.)</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="date" title="Due date" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            <input type="number" min={1} title="Max score" className="w-20 rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.max_score} onChange={(e) => setForm({ ...form, max_score: e.target.value })} />
          </div>
        </div>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          rows={2}
          placeholder="Instructions for students (optional)"
          value={form.instructions}
          onChange={(e) => setForm({ ...form, instructions: e.target.value })}
        />
        <div className="flex items-center gap-3">
          <button onClick={add} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            <Plus className="h-4 w-4" /> {saving ? "Adding…" : "Post assignment"}
          </button>
          {err && <span className="text-sm text-destructive">{err}</span>}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Assignment</th>
                <th className="px-4 py-3 font-medium">Class</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Teacher</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No assignments yet.</td></tr>
              ) : assignments.map((a) => {
                const cls = classes.find((c) => c.id === a.class_id);
                const subj = subjects.find((s) => s.id === a.subject_id);
                const teacher = teachers.find((t) => t.id === a.teacher_id);
                const overdue = a.due_date && a.due_date < new Date().toISOString().slice(0, 10);
                return (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium">{a.title}</p>
                      {a.instructions && <p className="text-xs text-muted-foreground line-clamp-1">{a.instructions}</p>}
                    </td>
                    <td className="px-4 py-3">{cls ? `${cls.name}${cls.section ? ` ${cls.section}` : ""}` : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{subj?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{teacher?.full_name ?? "—"}</td>
                    <td className={`px-4 py-3 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>{a.due_date ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                        {subCounts[a.id] ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(a.id)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ---------------- SUBMISSIONS ---------------- */

function SubmissionsTab({
  assignments,
  classes,
  subjects,
  onChange,
}: {
  assignments: AssignmentRow[];
  classes: ClassRow[];
  subjects: SubjectRow[];
  onChange: () => void;
}) {
  const [assignmentId, setAssignmentId] = useState<string>("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [draft, setDraft] = useState<Record<string, { status: string; score: string; feedback: string }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const assignment = useMemo(() => assignments.find((a) => a.id === assignmentId) || null, [assignments, assignmentId]);

  useEffect(() => {
    if (!assignmentId && assignments.length) setAssignmentId(assignments[0].id);
  }, [assignments, assignmentId]);

  useEffect(() => {
    if (!assignment) { setStudents([]); return; }
    (async () => {
      setLoading(true); setErr(null); setSaved(false);
      const [{ data: st }, { data: subs }] = await Promise.all([
        supabase.from("students").select("id,full_name,admission_no,class_id").eq("class_id", assignment.class_id).eq("status", "active").order("full_name"),
        supabase.from("assignment_submissions").select("id,assignment_id,student_id,content,submitted_at,status,score,feedback").eq("assignment_id", assignment.id),
      ]);
      const studs = (st ?? []) as StudentRow[];
      const map: Record<string, SubmissionRow> = {};
      (subs ?? []).forEach((r) => { map[(r as SubmissionRow).student_id] = r as SubmissionRow; });
      const d: Record<string, { status: string; score: string; feedback: string }> = {};
      studs.forEach((s) => {
        const e = map[s.id];
        d[s.id] = {
          status: e?.status ?? "pending",
          score: e?.score != null ? String(e.score) : "",
          feedback: e?.feedback ?? "",
        };
      });
      setStudents(studs);
      setDraft(d);
      setLoading(false);
    })();
  }, [assignment]);

  async function saveAll() {
    if (!assignment) return;
    setSaving(true); setErr(null);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;
    const rows = students
      .filter((s) => draft[s.id] && draft[s.id].status !== "pending")
      .map((s) => {
        const d = draft[s.id];
        const status = d.score !== "" ? "graded" : d.status;
        return {
          assignment_id: assignment.id,
          student_id: s.id,
          status,
          score: d.score !== "" ? Number(d.score) : null,
          feedback: d.feedback || null,
          submitted_at: status === "pending" ? null : new Date().toISOString(),
          graded_by: status === "graded" ? uid : null,
        };
      });
    if (!rows.length) { setSaving(false); return; }
    const { error } = await supabase.from("assignment_submissions").upsert(rows, { onConflict: "assignment_id,student_id" });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setSaved(true);
    onChange();
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1 text-muted-foreground">Assignment</label>
          <select value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            {assignments.length === 0 && <option value="">No assignments</option>}
            {assignments.map((a) => {
              const cls = classes.find((c) => c.id === a.class_id);
              const subj = subjects.find((s) => s.id === a.subject_id);
              return <option key={a.id} value={a.id}>{a.title} — {cls?.name ?? ""}{subj ? ` (${subj.name})` : ""}</option>;
            })}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={saveAll} disabled={saving || !students.length} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving…" : saved ? "Saved" : "Save marks"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Admission #</th>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium w-36">Status</th>
                <th className="px-4 py-3 font-medium w-32">Score</th>
                <th className="px-4 py-3 font-medium">Feedback</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : !assignment ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Post an assignment first.</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No active students in this class.</td></tr>
              ) : students.map((s) => {
                const d = draft[s.id] ?? { status: "pending", score: "", feedback: "" };
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs">{s.admission_no}</td>
                    <td className="px-4 py-3 font-medium">{s.full_name}</td>
                    <td className="px-4 py-3">
                      <select
                        value={d.status}
                        onChange={(e) => { setSaved(false); setDraft((x) => ({ ...x, [s.id]: { ...d, status: e.target.value } })); }}
                        className={`rounded-md border border-input px-2 py-1.5 text-xs font-medium ${STATUS_CLS[d.status] ?? ""}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="submitted">Submitted</option>
                        <option value="late">Late</option>
                        <option value="graded">Graded</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        max={assignment.max_score}
                        step="0.5"
                        value={d.score}
                        onChange={(e) => { setSaved(false); setDraft((x) => ({ ...x, [s.id]: { ...d, score: e.target.value } })); }}
                        placeholder="—"
                        className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                      />
                      <span className="ml-1 text-xs text-muted-foreground">/ {assignment.max_score}</span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={d.feedback}
                        onChange={(e) => { setSaved(false); setDraft((x) => ({ ...x, [s.id]: { ...d, feedback: e.target.value } })); }}
                        placeholder="Optional"
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {err && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{err}</p>}
    </section>
  );
}
