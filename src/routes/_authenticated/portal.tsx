import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { initializePayment, verifyPayment } from "@/lib/paystack.functions";
import {
  ArrowLeft, CalendarCheck2, Wallet, GraduationCap, User2, Loader2, NotebookPen,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({
    meta: [{ title: "My Portal | Ummina Aisha School" }],
  }),
  component: PortalPage,
});

type Student = {
  id: string;
  admission_no: string | null;
  full_name: string;
  gender: string | null;
  class_id: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
};
type ClassRow = { id: string; name: string; level: string | null; section: string | null };
type AttendanceRow = { date: string; status: string };
type Invoice = {
  id: string; title: string; amount: number; amount_paid: number;
  status: string; due_date: string | null; term: string | null; session: string | null;
};
type ExamScore = {
  id: string; score: number; max_score: number; remarks: string | null;
  exam: { name: string; term: string | null; academic_year: string | null } | null;
  subject: { name: string; code: string | null } | null;
};
type SubjectRow = { id: string; name: string; code: string | null };
type HomeworkAssignment = {
  id: string;
  title: string;
  instructions: string | null;
  subject_id: string | null;
  class_id: string;
  assigned_date: string;
  due_date: string | null;
  max_score: number;
};
type HomeworkSubmission = {
  assignment_id: string;
  student_id: string;
  status: string;
  score: number | null;
  feedback: string | null;
  submitted_at: string | null;
};
type ParentLink = {
  student_id: string;
  relationship: string;
  is_primary: boolean;
};

function grade(pct: number): string {
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  if (pct >= 40) return "E";
  return "F";
}

function fmtNaira(n: number) {
  return "₦" + Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PortalPage() {
  const navigate = useNavigate();
  const initPay = useServerFn(initializePayment);
  const verifyPay = useServerFn(verifyPayment);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [isParent, setIsParent] = useState(false);
  const [parentLinks, setParentLinks] = useState<ParentLink[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [scores, setScores] = useState<ExamScore[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [homework, setHomework] = useState<HomeworkAssignment[]>([]);
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<HomeworkSubmission[]>([]);

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setLoading(false);
      return;
    }
    setEmail(user.email ?? "");

    const [{ data: roleRows }, { data: linkRows }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase
        .from("parent_student_links")
        .select("student_id, relationship, is_primary")
        .eq("parent_user_id", user.id),
    ]);
    const parent = (roleRows ?? []).some((row) => row.role === "parent");
    const links = (linkRows ?? []) as ParentLink[];
    setIsParent(parent);
    setParentLinks(links);

    const studentQuery = supabase
      .from("students")
      .select("id, admission_no, full_name, gender, class_id, guardian_name, guardian_phone");
    const { data: myStudents } = parent
      ? links.length > 0
        ? await studentQuery.in("id", links.map((link) => link.student_id))
        : { data: [] as Student[] }
      : await studentQuery.eq("user_id", user.id);

    const list = (myStudents ?? []) as Student[];
    setStudents(list);

    if (list.length === 0) {
      setAttendance([]); setInvoices([]); setScores([]); setClasses([]); setSubjects([]); setHomework([]); setHomeworkSubmissions([]);
      setLoading(false);
      return;
    }
    const ids = list.map((s) => s.id);
    const classIds = list.map((s) => s.class_id).filter(Boolean) as string[];

    const [cls, att, inv, sc, hw, hwSubs] = await Promise.all([
      classIds.length
        ? supabase.from("classes").select("id, name, level, section").in("id", classIds)
        : Promise.resolve({ data: [] as ClassRow[] }),
      supabase.from("attendance").select("date, status").in("student_id", ids).order("date", { ascending: false }).limit(60),
      supabase.from("invoices").select("id, title, amount, amount_paid, status, due_date, term, session").in("student_id", ids).order("created_at", { ascending: false }),
      supabase
        .from("exam_scores")
        .select("id, score, max_score, remarks, exam:exams(name, term, academic_year), subject:subjects(name, code)")
        .in("student_id", ids)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("assignments")
        .select("id, title, instructions, subject_id, class_id, assigned_date, due_date, max_score")
        .in("class_id", classIds)
        .order("due_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("assignment_submissions")
        .select("assignment_id, student_id, status, score, feedback, submitted_at")
        .in("student_id", ids),
    ]);
    setClasses((cls.data ?? []) as ClassRow[]);
    setAttendance((att.data ?? []) as AttendanceRow[]);
    setInvoices((inv.data ?? []) as Invoice[]);
    setScores(((sc as { data: unknown }).data ?? []) as ExamScore[]);
    const assignments = (hw.data ?? []) as HomeworkAssignment[];
    setHomework(assignments);
    setHomeworkSubmissions((hwSubs.data ?? []) as HomeworkSubmission[]);
    const subjectIds = assignments.map((a) => a.subject_id).filter(Boolean) as string[];
    if (subjectIds.length) {
      const { data: subjectRows } = await supabase.from("subjects").select("id, name, code").in("id", subjectIds);
      setSubjects((subjectRows ?? []) as SubjectRow[]);
    } else {
      setSubjects([]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const attStats = useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter((a) => a.status === "present").length;
    const absent = attendance.filter((a) => a.status === "absent").length;
    const late = attendance.filter((a) => a.status === "late").length;
    const excused = attendance.filter((a) => a.status === "excused").length;
    const rate = total ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, late, excused, rate };
  }, [attendance]);

  const outstanding = useMemo(
    () => invoices.filter((i) => i.status !== "cancelled").reduce((sum, i) => sum + Math.max(0, Number(i.amount) - Number(i.amount_paid)), 0),
    [invoices],
  );

  async function pay(inv: Invoice) {
    if (!email) return;
    setPayingId(inv.id);
    try {
      const res = await initPay({
        data: {
          invoice_id: inv.id,
          email,
          callback_url: window.location.origin + "/portal",
        },
      });
      window.location.href = res.authorization_url;
    } catch (e) {
      alert((e as Error).message);
      setPayingId(null);
    }
  }

  // Confirm payment when the provider redirects back with ?reference=...
  useEffect(() => {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("reference") || url.searchParams.get("trxref");
    if (!ref) return;
    (async () => {
      try {
        const res = await verifyPay({ data: { reference: ref } });
        alert(res.status === "success" ? "Payment successful ✅" : "Payment not completed");
      } catch (e) {
        alert((e as Error).message);
      } finally {
        url.searchParams.delete("reference");
        url.searchParams.delete("trxref");
        window.history.replaceState({}, "", url.toString());
        load();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const classById = useMemo(() => {
    const m = new Map<string, ClassRow>();
    classes.forEach((c) => m.set(c.id, c));
    return m;
  }, [classes]);

  const subjectById = useMemo(() => {
    const m = new Map<string, SubjectRow>();
    subjects.forEach((subject) => m.set(subject.id, subject));
    return m;
  }, [subjects]);

  const submissionsByAssignment = useMemo(() => {
    const m = new Map<string, HomeworkSubmission[]>();
    homeworkSubmissions.forEach((submission) => {
      const current = m.get(submission.assignment_id) ?? [];
      current.push(submission);
      m.set(submission.assignment_id, current);
    });
    return m;
  }, [homeworkSubmissions]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
             <div>
               <h1 className="text-lg font-semibold">{isParent ? "Parent Portal" : "My Portal"}</h1>
               <p className="text-xs text-muted-foreground">Attendance, results & fees</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your data…
          </div>
        ) : students.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-8 text-center">
            <User2 className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">
              {isParent ? "No children are linked to your account yet." : "No student record is linked to your account yet."}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Please contact the school office to {isParent ? "link your children to" : "link your admission record to"} <span className="font-medium">{email}</span>.
            </p>
            <Link to="/dashboard" className="inline-block mt-4 text-sm text-primary underline">
              Return to dashboard
            </Link>
          </div>
        ) : (
          <>
            {/* Profile card(s) */}
            <section className="grid gap-4 md:grid-cols-2">
              {students.map((s) => {
                const c = s.class_id ? classById.get(s.class_id) : undefined;
                return (
                  <div key={s.id} className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-start justify-between">
                      <div>
                         <p className="text-xs uppercase tracking-wide text-muted-foreground">
                           {isParent ? (parentLinks.find((link) => link.student_id === s.id)?.relationship ?? "Child") : "Student"}
                         </p>
                        <p className="text-lg font-semibold mt-1">{s.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {s.admission_no ? `Adm. ${s.admission_no}` : "No admission no."}
                          {c ? ` · ${c.name}${c.section ? " " + c.section : ""}` : ""}
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                        <User2 className="h-5 w-5" />
                      </div>
                    </div>
                    {(s.guardian_name || s.guardian_phone) && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Guardian: {s.guardian_name ?? "—"} {s.guardian_phone ? `· ${s.guardian_phone}` : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </section>

            {/* Quick stats */}
            <section className="grid gap-4 sm:grid-cols-3">
              <StatCard icon={CalendarCheck2} label="Attendance rate (last 60)" value={`${attStats.rate}%`} sub={`${attStats.present}/${attStats.total} present`} />
              <StatCard icon={Wallet} label="Outstanding fees" value={fmtNaira(outstanding)} sub={`${invoices.filter(i => i.status !== "paid" && i.status !== "cancelled").length} open`} />
              <StatCard icon={GraduationCap} label="Recorded scores" value={String(scores.length)} sub="most recent 50" />
            </section>

            {/* Invoices */}
            <section>
              <h2 className="text-base font-semibold mb-3">Invoices</h2>
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-2">Title</th>
                      <th className="text-left px-4 py-2">Term / Session</th>
                      <th className="text-right px-4 py-2">Amount</th>
                      <th className="text-right px-4 py-2">Paid</th>
                      <th className="text-left px-4 py-2">Status</th>
                      <th className="text-right px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No invoices yet.</td></tr>
                    ) : invoices.map((i) => {
                      const bal = Number(i.amount) - Number(i.amount_paid);
                      return (
                        <tr key={i.id} className="border-t border-border">
                          <td className="px-4 py-2">{i.title}</td>
                          <td className="px-4 py-2 text-muted-foreground">{[i.term, i.session].filter(Boolean).join(" · ") || "—"}</td>
                          <td className="px-4 py-2 text-right">{fmtNaira(Number(i.amount))}</td>
                          <td className="px-4 py-2 text-right">{fmtNaira(Number(i.amount_paid))}</td>
                          <td className="px-4 py-2">
                            <span className={
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium " +
                              (i.status === "paid" ? "bg-primary/15 text-primary" :
                               i.status === "partial" ? "bg-yellow-500/15 text-yellow-700" :
                               "bg-muted text-foreground")
                            }>{i.status}</span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            {i.status !== "paid" && i.status !== "cancelled" && bal > 0 ? (
                              <button
                                onClick={() => pay(i)}
                                disabled={payingId === i.id}
                                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                              >
                                {payingId === i.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wallet className="h-3 w-3" />}
                                Pay {fmtNaira(bal)}
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Exam results */}
            <section>
              <h2 className="text-base font-semibold mb-3">Recent results</h2>
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-2">Exam</th>
                      <th className="text-left px-4 py-2">Subject</th>
                      <th className="text-right px-4 py-2">Score</th>
                      <th className="text-right px-4 py-2">%</th>
                      <th className="text-left px-4 py-2">Grade</th>
                      <th className="text-left px-4 py-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scores.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No results published yet.</td></tr>
                    ) : scores.map((r) => {
                      const pct = r.max_score ? (Number(r.score) / Number(r.max_score)) * 100 : 0;
                      return (
                        <tr key={r.id} className="border-t border-border">
                          <td className="px-4 py-2">
                            {r.exam?.name ?? "—"}
                            <span className="text-xs text-muted-foreground ml-1">
                              {[r.exam?.term, r.exam?.academic_year].filter(Boolean).join(" · ")}
                            </span>
                          </td>
                          <td className="px-4 py-2">{r.subject?.name ?? "—"}</td>
                          <td className="px-4 py-2 text-right">{r.score}/{r.max_score}</td>
                          <td className="px-4 py-2 text-right">{pct.toFixed(1)}%</td>
                          <td className="px-4 py-2 font-medium">{grade(pct)}</td>
                          <td className="px-4 py-2 text-muted-foreground">{r.remarks ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Homework */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <NotebookPen className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">Homework</h2>
              </div>
              <div className="space-y-3">
                {homework.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-6 text-center text-sm text-muted-foreground">
                    No homework has been posted for your class yet.
                  </div>
                ) : homework.map((assignment) => {
                  const className = classById.get(assignment.class_id);
                  const subject = assignment.subject_id ? subjectById.get(assignment.subject_id) : undefined;
                  const submissions = submissionsByAssignment.get(assignment.id) ?? [];
                  const isDue = assignment.due_date && assignment.due_date < new Date().toISOString().slice(0, 10);
                  return (
                    <div key={assignment.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-medium">{assignment.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {[subject?.name, className ? `${className.name}${className.section ? ` ${className.section}` : ""}` : null].filter(Boolean).join(" · ") || "Class assignment"}
                          </p>
                        </div>
                        <div className={`text-xs font-medium ${isDue ? "text-destructive" : "text-muted-foreground"}`}>
                          {assignment.due_date ? `Due ${assignment.due_date}` : "No due date"}
                        </div>
                      </div>
                      {assignment.instructions && <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{assignment.instructions}</p>}
                      <div className="mt-4 space-y-2">
                        {students.map((student) => {
                          const submission = submissions.find((item) => item.student_id === student.id);
                          const status = submission?.status ?? "pending";
                          return (
                            <div key={student.id} className="flex flex-col gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                              <span className="font-medium">{isParent ? student.full_name : "My submission"}</span>
                              <span className="text-muted-foreground">
                                {status === "graded" && submission?.score != null
                                  ? `Graded: ${submission.score}/${assignment.max_score}`
                                  : status === "submitted"
                                    ? "Submitted"
                                    : status === "late"
                                      ? "Submitted late"
                                      : "Not submitted"}
                                {submission?.feedback ? ` · ${submission.feedback}` : ""}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Attendance detail */}
            <section>
              <h2 className="text-base font-semibold mb-3">Attendance (last 60 days on record)</h2>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                <MiniStat label="Present" value={attStats.present} tone="ok" />
                <MiniStat label="Absent" value={attStats.absent} tone="bad" />
                <MiniStat label="Late" value={attStats.late} tone="warn" />
                <MiniStat label="Excused" value={attStats.excused} tone="muted" />
              </div>
              {attendance.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1">
                  {attendance.slice(0, 30).map((a, idx) => (
                    <span
                      key={idx}
                      title={`${a.date} · ${a.status}`}
                      className={
                        "h-6 px-2 inline-flex items-center rounded text-[10px] font-medium " +
                        (a.status === "present" ? "bg-primary/20 text-primary" :
                         a.status === "absent" ? "bg-destructive/15 text-destructive" :
                         a.status === "late" ? "bg-yellow-500/20 text-yellow-700" :
                         "bg-muted text-foreground")
                      }
                    >
                      {a.date.slice(5)}
                    </span>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>, label: string, value: string, sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: "ok" | "bad" | "warn" | "muted" }) {
  const cls =
    tone === "ok" ? "bg-primary/10 text-primary" :
    tone === "bad" ? "bg-destructive/10 text-destructive" :
    tone === "warn" ? "bg-yellow-500/10 text-yellow-700" :
    "bg-muted text-foreground";
  return (
    <div className={`rounded-lg px-4 py-3 ${cls}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}
