import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Save, Check, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/exams")({
  head: () => ({ meta: [{ title: "Exams & Grading | Ummina Aisha School" }] }),
  component: ExamsPage,
});

type ClassRow = { id: string; name: string; section: string | null };
type SubjectRow = { id: string; name: string; code: string | null; class_id: string | null };
type ExamRow = {
  id: string;
  name: string;
  term: string | null;
  academic_year: string | null;
  class_id: string | null;
  start_date: string | null;
  end_date: string | null;
};
type StudentRow = { id: string; full_name: string; admission_no: string; class_id: string | null };
type ScoreRow = {
  id: string;
  exam_id: string;
  student_id: string;
  subject_id: string;
  score: number;
  max_score: number;
  remarks: string | null;
};

type Tab = "exams" | "subjects" | "scores";

function gradeFor(pct: number): { letter: string; cls: string } {
  if (pct >= 80) return { letter: "A", cls: "bg-primary/15 text-primary" };
  if (pct >= 70) return { letter: "B", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" };
  if (pct >= 60) return { letter: "C", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
  if (pct >= 50) return { letter: "D", cls: "bg-orange-500/15 text-orange-700 dark:text-orange-400" };
  return { letter: "F", cls: "bg-destructive/15 text-destructive" };
}

function ExamsPage() {
  const [tab, setTab] = useState<Tab>("exams");
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);

  async function refresh() {
    const [{ data: c }, { data: s }, { data: e }] = await Promise.all([
      supabase.from("classes").select("id,name,section").order("name"),
      supabase.from("subjects").select("id,name,code,class_id").order("name"),
      supabase.from("exams").select("id,name,term,academic_year,class_id,start_date,end_date").order("start_date", { ascending: false }),
    ]);
    setClasses((c ?? []) as ClassRow[]);
    setSubjects((s ?? []) as SubjectRow[]);
    setExams((e ?? []) as ExamRow[]);
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
            {(["exams", "subjects", "scores"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                  tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "scores" ? "Enter scores" : t}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Exams & Grading</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create exams, define subjects, and record student scores. Grades are computed automatically from percentage.
          </p>
        </div>

        {tab === "exams" && <ExamsTab exams={exams} classes={classes} onChange={refresh} />}
        {tab === "subjects" && <SubjectsTab subjects={subjects} classes={classes} onChange={refresh} />}
        {tab === "scores" && <ScoresTab exams={exams} subjects={subjects} classes={classes} />}
      </main>
    </div>
  );
}

/* ---------------- EXAMS ---------------- */

function ExamsTab({ exams, classes, onChange }: { exams: ExamRow[]; classes: ClassRow[]; onChange: () => void }) {
  const [form, setForm] = useState({
    name: "", term: "", academic_year: "", class_id: "", start_date: "", end_date: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add() {
    if (!form.name.trim()) return;
    setSaving(true); setErr(null);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("exams").insert({
      name: form.name.trim(),
      term: form.term || null,
      academic_year: form.academic_year || null,
      class_id: form.class_id || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      created_by: u.user?.id ?? null,
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setForm({ name: "", term: "", academic_year: "", class_id: "", start_date: "", end_date: "" });
    onChange();
  }

  async function remove(id: string) {
    if (!confirm("Delete this exam and all its scores?")) return;
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) { alert(error.message); return; }
    onChange();
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold mb-3">New exam</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input className="rounded-md border border-input bg-background px-3 py-2 text-sm lg:col-span-2" placeholder="Name (e.g. First Term Test)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Term" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} />
          <input className="rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Year (2025/26)" value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} />
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
            <option value="">All classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ""}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="date" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <input type="date" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={add} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            <Plus className="h-4 w-4" /> Add exam
          </button>
          {err && <span className="text-sm text-destructive">{err}</span>}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Exam</th>
              <th className="px-4 py-3 font-medium">Term / Year</th>
              <th className="px-4 py-3 font-medium">Class</th>
              <th className="px-4 py-3 font-medium">Dates</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {exams.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No exams yet.</td></tr>
            ) : exams.map((e) => {
              const cls = classes.find((c) => c.id === e.class_id);
              return (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{e.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{[e.term, e.academic_year].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-4 py-3">{cls ? `${cls.name}${cls.section ? ` ${cls.section}` : ""}` : "All"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{[e.start_date, e.end_date].filter(Boolean).join(" → ") || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(e.id)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------------- SUBJECTS ---------------- */

function SubjectsTab({ subjects, classes, onChange }: { subjects: SubjectRow[]; classes: ClassRow[]; onChange: () => void }) {
  const [form, setForm] = useState({ name: "", code: "", class_id: "" });
  const [err, setErr] = useState<string | null>(null);

  async function add() {
    if (!form.name.trim()) return;
    setErr(null);
    const { error } = await supabase.from("subjects").insert({
      name: form.name.trim(),
      code: form.code || null,
      class_id: form.class_id || null,
    });
    if (error) { setErr(error.message); return; }
    setForm({ name: "", code: "", class_id: "" });
    onChange();
  }
  async function remove(id: string) {
    if (!confirm("Delete this subject?")) return;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) { alert(error.message); return; }
    onChange();
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold mb-3">New subject</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <input className="rounded-md border border-input bg-background px-3 py-2 text-sm sm:col-span-2" placeholder="Subject name (e.g. Qur'an Memorization)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Code (opt.)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
            <option value="">All classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ""}</option>)}
          </select>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={add} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> Add subject
          </button>
          {err && <span className="text-sm text-destructive">{err}</span>}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Class</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {subjects.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No subjects yet.</td></tr>
            ) : subjects.map((s) => {
              const cls = classes.find((c) => c.id === s.class_id);
              return (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.code ?? "—"}</td>
                  <td className="px-4 py-3">{cls ? `${cls.name}${cls.section ? ` ${cls.section}` : ""}` : "All"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(s.id)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------------- SCORES ---------------- */

function ScoresTab({
  exams,
  subjects,
  classes,
}: {
  exams: ExamRow[];
  subjects: SubjectRow[];
  classes: ClassRow[];
}) {
  const [examId, setExamId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [maxScore, setMaxScore] = useState<number>(100);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});
  const [draft, setDraft] = useState<Record<string, { score: string; remarks: string }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const exam = useMemo(() => exams.find((e) => e.id === examId) || null, [exams, examId]);
  const availableSubjects = useMemo(() => {
    if (!exam) return subjects;
    return subjects.filter((s) => !s.class_id || s.class_id === exam.class_id);
  }, [subjects, exam]);

  useEffect(() => {
    if (!examId && exams.length) setExamId(exams[0].id);
  }, [exams, examId]);
  useEffect(() => {
    if (!subjectId && availableSubjects.length) setSubjectId(availableSubjects[0].id);
  }, [availableSubjects, subjectId]);

  useEffect(() => {
    if (!exam || !subjectId) { setStudents([]); return; }
    (async () => {
      setLoading(true); setErr(null); setSaved(false);
      let q = supabase.from("students").select("id,full_name,admission_no,class_id").eq("status", "active").order("full_name");
      if (exam.class_id) q = q.eq("class_id", exam.class_id);
      const [{ data: st }, { data: sc }] = await Promise.all([
        q,
        supabase.from("exam_scores").select("id,exam_id,student_id,subject_id,score,max_score,remarks").eq("exam_id", exam.id).eq("subject_id", subjectId),
      ]);
      const studs = (st ?? []) as StudentRow[];
      const map: Record<string, ScoreRow> = {};
      (sc ?? []).forEach((r) => { map[(r as ScoreRow).student_id] = r as ScoreRow; });
      const d: Record<string, { score: string; remarks: string }> = {};
      studs.forEach((s) => {
        const e = map[s.id];
        d[s.id] = { score: e ? String(e.score) : "", remarks: e?.remarks ?? "" };
      });
      const inferredMax = Object.values(map)[0]?.max_score ?? 100;
      setMaxScore(Number(inferredMax));
      setStudents(studs);
      setScores(map);
      setDraft(d);
      setLoading(false);
    })();
  }, [exam, subjectId]);

  async function saveAll() {
    if (!exam || !subjectId) return;
    setSaving(true); setErr(null);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;
    const rows = students
      .filter((s) => draft[s.id]?.score !== "" && draft[s.id]?.score != null)
      .map((s) => ({
        exam_id: exam.id,
        subject_id: subjectId,
        student_id: s.id,
        score: Number(draft[s.id].score) || 0,
        max_score: Number(maxScore) || 100,
        remarks: draft[s.id].remarks || null,
        recorded_by: uid,
      }));
    if (!rows.length) { setSaving(false); return; }
    const { error } = await supabase.from("exam_scores").upsert(rows, { onConflict: "exam_id,student_id,subject_id" });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setSaved(true);
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="block text-xs font-medium mb-1 text-muted-foreground">Exam</label>
          <select value={examId} onChange={(e) => setExamId(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            {exams.length === 0 && <option value="">No exams</option>}
            {exams.map((e) => {
              const cls = classes.find((c) => c.id === e.class_id);
              return <option key={e.id} value={e.id}>{e.name} {cls ? `(${cls.name})` : ""}</option>;
            })}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-muted-foreground">Subject</label>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            {availableSubjects.length === 0 && <option value="">No subjects</option>}
            {availableSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-muted-foreground">Max score</label>
          <input type="number" min={1} value={maxScore} onChange={(e) => setMaxScore(Number(e.target.value) || 100)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="flex items-end">
          <button onClick={saveAll} disabled={saving || !students.length} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving…" : saved ? "Saved" : "Save scores"}
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
                <th className="px-4 py-3 font-medium w-32">Score</th>
                <th className="px-4 py-3 font-medium">Grade</th>
                <th className="px-4 py-3 font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : !exam ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Create an exam first.</td></tr>
              ) : !subjectId ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Create a subject first.</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No active students for this exam's class.</td></tr>
              ) : students.map((s) => {
                const val = draft[s.id]?.score ?? "";
                const num = Number(val);
                const pct = val === "" || isNaN(num) ? null : (num / (maxScore || 100)) * 100;
                const g = pct == null ? null : gradeFor(pct);
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs">{s.admission_no}</td>
                    <td className="px-4 py-3 font-medium">{s.full_name}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        max={maxScore}
                        step="0.5"
                        value={val}
                        onChange={(e) => { setSaved(false); setDraft((d) => ({ ...d, [s.id]: { ...d[s.id], score: e.target.value } })); }}
                        placeholder="—"
                        className="w-24 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                      />
                      <span className="ml-2 text-xs text-muted-foreground">/ {maxScore}</span>
                    </td>
                    <td className="px-4 py-3">
                      {g ? (
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${g.cls}`}>
                          {g.letter} <span className="text-[10px] font-normal opacity-70">{pct!.toFixed(0)}%</span>
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={draft[s.id]?.remarks ?? ""}
                        onChange={(e) => { setSaved(false); setDraft((d) => ({ ...d, [s.id]: { ...d[s.id], remarks: e.target.value } })); }}
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
      {Object.keys(scores).length > 0 && (
        <p className="text-xs text-muted-foreground">{Object.keys(scores).length} existing score(s) will be updated on save.</p>
      )}
    </section>
  );
}
