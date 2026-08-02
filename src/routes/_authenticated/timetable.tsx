import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Trash2, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/timetable")({
  head: () => ({
    meta: [
      { title: "Timetable | Ummina Aisha School" },
      { name: "description", content: "Build weekly class schedules with periods, subjects and teacher assignments." },
      { property: "og:title", content: "Timetable | Ummina Aisha School" },
      { property: "og:description", content: "Weekly class schedules, periods and teacher assignments." },
    ],
  }),
  component: TimetablePage,
});

type ClassRow = { id: string; name: string; section: string | null };
type Period = { id: string; name: string; start_time: string; end_time: string; sort_order: number };
type Subject = { id: string; name: string; class_id: string | null };
type Teacher = { id: string; full_name: string };
type Slot = {
  id: string;
  class_id: string;
  period_id: string;
  day_of_week: number;
  subject_id: string | null;
  teacher_id: string | null;
  room: string | null;
};

const DAYS = [
  { n: 1, label: "Monday" },
  { n: 2, label: "Tuesday" },
  { n: 3, label: "Wednesday" },
  { n: 4, label: "Thursday" },
  { n: 5, label: "Friday" },
  { n: 6, label: "Saturday" },
];

function hhmm(t: string) {
  return t?.slice(0, 5) ?? "";
}

function TimetablePage() {
  const [tab, setTab] = useState<"grid" | "periods">("grid");
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [classId, setClassId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // period form
  const [pName, setPName] = useState("");
  const [pStart, setPStart] = useState("08:00");
  const [pEnd, setPEnd] = useState("08:45");

  async function loadBase() {
    const [{ data: c }, { data: p }, { data: s }, { data: t }] = await Promise.all([
      supabase.from("classes").select("id,name,section").order("name"),
      supabase.from("periods").select("id,name,start_time,end_time,sort_order").order("sort_order"),
      supabase.from("subjects").select("id,name,class_id").order("name"),
      supabase.from("teachers").select("id,full_name").eq("status", "active").order("full_name"),
    ]);
    setClasses((c ?? []) as ClassRow[]);
    setPeriods((p ?? []) as Period[]);
    setSubjects((s ?? []) as Subject[]);
    setTeachers((t ?? []) as Teacher[]);
    if (c && c.length) setClassId((prev) => prev || c[0].id);
    setLoading(false);
  }

  async function loadSlots(cid: string) {
    if (!cid) return setSlots([]);
    const { data } = await supabase
      .from("timetable_slots")
      .select("id,class_id,period_id,day_of_week,subject_id,teacher_id,room")
      .eq("class_id", cid);
    setSlots((data ?? []) as Slot[]);
  }

  useEffect(() => { loadBase(); }, []);
  useEffect(() => { loadSlots(classId); }, [classId]);

  const slotMap = useMemo(() => {
    const m: Record<string, Slot> = {};
    slots.forEach((s) => { m[`${s.period_id}|${s.day_of_week}`] = s; });
    return m;
  }, [slots]);

  const classSubjects = useMemo(
    () => subjects.filter((s) => !s.class_id || s.class_id === classId),
    [subjects, classId],
  );

  async function upsertSlot(periodId: string, day: number, patch: Partial<Slot>) {
    setErr(null);
    const current = slotMap[`${periodId}|${day}`];
    const row = {
      class_id: classId,
      period_id: periodId,
      day_of_week: day,
      subject_id: current?.subject_id ?? null,
      teacher_id: current?.teacher_id ?? null,
      room: current?.room ?? null,
      ...patch,
    };
    const { error } = await supabase
      .from("timetable_slots")
      .upsert(row, { onConflict: "class_id,period_id,day_of_week" });
    if (error) { setErr(error.message); return; }
    loadSlots(classId);
  }

  async function clearSlot(id: string) {
    const { error } = await supabase.from("timetable_slots").delete().eq("id", id);
    if (error) { setErr(error.message); return; }
    loadSlots(classId);
  }

  async function addPeriod(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!pName.trim()) return;
    const { error } = await supabase.from("periods").insert({
      name: pName.trim(),
      start_time: pStart,
      end_time: pEnd,
      sort_order: (periods.at(-1)?.sort_order ?? 0) + 1,
    });
    if (error) { setErr(error.message); return; }
    setPName("");
    loadBase();
  }

  async function deletePeriod(id: string) {
    const { error } = await supabase.from("periods").delete().eq("id", id);
    if (error) { setErr(error.message); return; }
    loadBase();
    loadSlots(classId);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Timetable</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Weekly class schedules — assign a subject, teacher and room to each period.
          </p>
        </div>

        <div className="flex gap-2 border-b border-border">
          {(["grid", "periods"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition ${
                tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "grid" ? "Weekly schedule" : "Periods"}
            </button>
          ))}
        </div>

        {err && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{err}</p>}

        {tab === "grid" && (
          <div className="space-y-4">
            <div className="max-w-xs">
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Class</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {classes.length === 0 && <option value="">No classes</option>}
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.section ? ` ${c.section}` : ""}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !classId ? (
              <p className="text-sm text-muted-foreground">
                Create a class first in <Link to="/classes" className="text-primary underline">Classes</Link>.
              </p>
            ) : periods.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add periods in the Periods tab first.</p>
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-3 font-medium">Period</th>
                        {DAYS.map((d) => <th key={d.n} className="px-3 py-3 font-medium">{d.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {periods.map((p) => (
                        <tr key={p.id} className="border-t border-border align-top">
                          <td className="px-3 py-3 whitespace-nowrap">
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{hhmm(p.start_time)}–{hhmm(p.end_time)}</p>
                          </td>
                          {DAYS.map((d) => {
                            const slot = slotMap[`${p.id}|${d.n}`];
                            return (
                              <td key={d.n} className="px-2 py-2">
                                <div className="space-y-1">
                                  <select
                                    value={slot?.subject_id ?? ""}
                                    onChange={(e) => upsertSlot(p.id, d.n, { subject_id: e.target.value || null })}
                                    className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                                  >
                                    <option value="">— Subject —</option>
                                    {classSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>
                                  <select
                                    value={slot?.teacher_id ?? ""}
                                    onChange={(e) => upsertSlot(p.id, d.n, { teacher_id: e.target.value || null })}
                                    className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                                  >
                                    <option value="">— Teacher —</option>
                                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                                  </select>
                                  <div className="flex items-center gap-1">
                                    <input
                                      defaultValue={slot?.room ?? ""}
                                      key={(slot?.id ?? "new") + "-room"}
                                      onBlur={(e) => {
                                        const v = e.target.value.trim() || null;
                                        if (v !== (slot?.room ?? null)) upsertSlot(p.id, d.n, { room: v });
                                      }}
                                      placeholder="Room"
                                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                                    />
                                    {slot && (
                                      <button
                                        onClick={() => clearSlot(slot.id)}
                                        title="Clear slot"
                                        className="rounded-md border border-border p-1 text-muted-foreground hover:bg-accent"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "periods" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <form onSubmit={addPeriod} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h2 className="text-sm font-semibold">Add period</h2>
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Name</label>
                <input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Period 6"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Start</label>
                  <input type="time" value={pStart} onChange={(e) => setPStart(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">End</label>
                  <input type="time" value={pEnd} onChange={(e) => setPEnd(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
              </div>
              <button className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                <Plus className="h-4 w-4" /> Add period
              </button>
              <p className="text-xs text-muted-foreground">Only admins can change periods.</p>
            </form>

            <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Period</th>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {periods.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No periods yet.</td></tr>
                  ) : periods.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{hhmm(p.start_time)}–{hhmm(p.end_time)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deletePeriod(p.id)} className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-accent">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
