import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STAFF = new Set(["admin", "teacher", "accountant", "hr", "librarian", "receptionist", "transport_manager"]);

async function assertStaff(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r: any) => r.role);
  if (!roles.some((r: string) => STAFF.has(r))) throw new Error("Forbidden");
  return roles;
}

export const getReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase, userId);

    // Totals
    const [studentsRes, teachersRes, classesRes, subjectsRes] = await Promise.all([
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("teachers").select("*", { count: "exact", head: true }),
      supabase.from("classes").select("*", { count: "exact", head: true }),
      supabase.from("subjects").select("*", { count: "exact", head: true }),
    ]);

    // Students by class
    const { data: classRows } = await supabase.from("classes").select("id, name");
    const { data: studentRows } = await supabase.from("students").select("class_id");
    const classCounts = (classRows ?? []).map((c: any) => ({
      name: c.name as string,
      students: (studentRows ?? []).filter((s: any) => s.class_id === c.id).length,
    }));

    // Attendance last 30 days
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().slice(0, 10);
    const { data: attendance } = await supabase
      .from("attendance")
      .select("date, status")
      .gte("date", sinceStr);
    const attMap = new Map<string, { present: number; absent: number; late: number; excused: number; total: number }>();
    for (const a of attendance ?? []) {
      const k = a.date as string;
      const bucket = attMap.get(k) ?? { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
      bucket.total += 1;
      if (a.status === "present") bucket.present += 1;
      else if (a.status === "absent") bucket.absent += 1;
      else if (a.status === "late") bucket.late += 1;
      else if (a.status === "excused") bucket.excused += 1;
      attMap.set(k, bucket);
    }
    const attendanceDaily = Array.from(attMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        rate: v.total ? Math.round(((v.present + v.late) / v.total) * 100) : 0,
        present: v.present,
        absent: v.absent,
        late: v.late,
        excused: v.excused,
      }));

    // Finance
    const { data: invoices } = await supabase
      .from("invoices")
      .select("amount, amount_paid, status, created_at");
    let billed = 0, collected = 0, outstanding = 0;
    let paidCount = 0, partialCount = 0, unpaidCount = 0;
    const monthMap = new Map<string, { billed: number; collected: number }>();
    for (const inv of invoices ?? []) {
      const amt = Number(inv.amount ?? 0);
      const paid = Number(inv.amount_paid ?? 0);
      billed += amt;
      collected += paid;
      outstanding += Math.max(0, amt - paid);
      if (inv.status === "paid") paidCount++;
      else if (inv.status === "partial") partialCount++;
      else unpaidCount++;
      const m = (inv.created_at as string).slice(0, 7);
      const b = monthMap.get(m) ?? { billed: 0, collected: 0 };
      b.billed += amt; b.collected += paid;
      monthMap.set(m, b);
    }
    const financeMonthly = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, v]) => ({ month, billed: v.billed, collected: v.collected }));

    // Exams — average per exam
    const { data: exams } = await supabase.from("exams").select("id, title");
    const { data: scores } = await supabase.from("exam_scores").select("exam_id, score, max_score");
    const examAvg = (exams ?? []).map((e: any) => {
      const rows = (scores ?? []).filter((s: any) => s.exam_id === e.id);
      const avg = rows.length
        ? Math.round(
            (rows.reduce((sum: number, r: any) => sum + (Number(r.score) / Number(r.max_score)) * 100, 0) /
              rows.length) * 10,
          ) / 10
        : 0;
      return { title: e.title as string, average: avg, count: rows.length };
    });

    // Grade distribution
    const gradeBuckets: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    for (const s of scores ?? []) {
      const pct = (Number(s.score) / Number(s.max_score)) * 100;
      const g = pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 50 ? "D" : pct >= 40 ? "E" : "F";
      gradeBuckets[g] += 1;
    }
    const gradeDistribution = Object.entries(gradeBuckets).map(([grade, count]) => ({ grade, count }));

    return {
      totals: {
        students: studentsRes.count ?? 0,
        teachers: teachersRes.count ?? 0,
        classes: classesRes.count ?? 0,
        subjects: subjectsRes.count ?? 0,
      },
      classCounts,
      attendanceDaily,
      finance: {
        billed, collected, outstanding,
        invoiceStatus: [
          { name: "Paid", value: paidCount },
          { name: "Partial", value: partialCount },
          { name: "Unpaid", value: unpaidCount },
        ],
        monthly: financeMonthly,
      },
      examAvg,
      gradeDistribution,
    };
  });
