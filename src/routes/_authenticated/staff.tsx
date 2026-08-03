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
  Briefcase,
  Calendar,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({ meta: [{ title: "Staff & HR | Ummina Aisha School" }] }),
  component: StaffPage,
});

type Staff = {
  id: string;
  staff_no: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  designation: string | null;
  hire_date: string | null;
  status: string;
  notes: string | null;
};

type LeaveRequest = {
  id: string;
  staff_id: string;
  staff: { full_name: string; staff_no: string } | null;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  requested_at: string;
};

const emptyStaff: Omit<Staff, "id"> = {
  staff_no: "",
  full_name: "",
  email: "",
  phone: "",
  department: "",
  designation: "",
  hire_date: null,
  status: "active",
  notes: "",
};

const emptyLeave = {
  staff_id: "",
  leave_type: "annual",
  start_date: "",
  end_date: "",
  reason: "",
  status: "pending",
};

function StaffPage() {
  const [roles, setRoles] = useState<string[]>([]);
  const [tab, setTab] = useState<"staff" | "leave">("staff");

  const [staff, setStaff] = useState<Staff[]>([]);
  const [leave, setLeave] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [staffOpen, setStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffForm, setStaffForm] = useState<Omit<Staff, "id">>(emptyStaff);

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveRequest | null>(null);
  const [leaveForm, setLeaveForm] = useState(emptyLeave);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isAdminOrHr = useMemo(
    () => roles.includes("admin") || roles.includes("hr"),
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

  async function loadStaff() {
    const { data } = await supabase
      .from("staff")
      .select("*")
      .order("full_name", { ascending: true });
    setStaff((data ?? []) as Staff[]);
  }

  async function loadLeave() {
    const { data } = await supabase
      .from("leave_requests")
      .select("*, staff:staff_id(full_name, staff_no)")
      .order("requested_at", { ascending: false });
    setLeave((data ?? []) as LeaveRequest[]);
  }

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadRoles(), loadStaff(), loadLeave()]);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openNewStaff() {
    setEditingStaff(null);
    setStaffForm(emptyStaff);
    setErr(null);
    setStaffOpen(true);
  }

  function openEditStaff(s: Staff) {
    setEditingStaff(s);
    const { id: _id, ...rest } = s;
    void _id;
    setStaffForm(rest);
    setErr(null);
    setStaffOpen(true);
  }

  async function saveStaff(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const payload = {
      ...staffForm,
      email: staffForm.email || null,
      phone: staffForm.phone || null,
      department: staffForm.department || null,
      designation: staffForm.designation || null,
      hire_date: staffForm.hire_date || null,
      notes: staffForm.notes || null,
    };
    const res = editingStaff
      ? await supabase.from("staff").update(payload).eq("id", editingStaff.id)
      : await supabase.from("staff").insert(payload);
    if (res.error) {
      setErr(res.error.message);
      setSaving(false);
      return;
    }
    setStaffOpen(false);
    setSaving(false);
    await loadStaff();
  }

  async function removeStaff(s: Staff) {
    if (!confirm(`Remove ${s.full_name}?`)) return;
    const { error } = await supabase.from("staff").delete().eq("id", s.id);
    if (error) alert(error.message);
    else await loadStaff();
  }

  function openNewLeave() {
    setEditingLeave(null);
    setLeaveForm({ ...emptyLeave, staff_id: isAdminOrHr ? "" : myStaffId });
    setErr(null);
    setLeaveOpen(true);
  }

  function openEditLeave(l: LeaveRequest) {
    setEditingLeave(l);
    setLeaveForm({
      staff_id: l.staff_id,
      leave_type: l.leave_type,
      start_date: l.start_date,
      end_date: l.end_date,
      reason: l.reason ?? "",
      status: l.status,
    });
    setErr(null);
    setLeaveOpen(true);
  }

  async function saveLeave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const payload = {
      staff_id: leaveForm.staff_id,
      leave_type: leaveForm.leave_type,
      start_date: leaveForm.start_date,
      end_date: leaveForm.end_date,
      reason: leaveForm.reason || null,
      status: leaveForm.status,
    };
    const res = editingLeave
      ? await supabase.from("leave_requests").update(payload).eq("id", editingLeave.id)
      : await supabase.from("leave_requests").insert(payload);
    if (res.error) {
      setErr(res.error.message);
      setSaving(false);
      return;
    }
    setLeaveOpen(false);
    setSaving(false);
    await loadLeave();
  }

  async function removeLeave(l: LeaveRequest) {
    if (!confirm("Delete this leave request?")) return;
    const { error } = await supabase.from("leave_requests").delete().eq("id", l.id);
    if (error) alert(error.message);
    else await loadLeave();
  }

  const myStaffId = useMemo(() => {
    // Best-effort: if a staff record is linked to the current user, use it.
    return "";
  }, []);

  const filteredStaff = staff.filter((s) => {
    const term = q.toLowerCase();
    return (
      !term ||
      s.full_name.toLowerCase().includes(term) ||
      s.staff_no.toLowerCase().includes(term) ||
      (s.department ?? "").toLowerCase().includes(term) ||
      (s.designation ?? "").toLowerCase().includes(term)
    );
  });

  const leaveDays = (start: string, end: string) => {
    const a = new Date(start);
    const b = new Date(end);
    const diff = Math.max(0, Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    return diff;
  };

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
            {tab === "staff" && isAdminOrHr && (
              <button
                onClick={openNewStaff}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> Add staff
              </button>
            )}
            {tab === "leave" && (
              <button
                onClick={openNewLeave}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> Request leave
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff & HR</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage non-teaching staff and leave requests.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-border">
          <button
            onClick={() => setTab("staff")}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === "staff"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className="h-4 w-4" /> Staff directory
          </button>
          <button
            onClick={() => setTab("leave")}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === "leave"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="h-4 w-4" /> Leave requests
          </button>
        </div>

        {tab === "staff" && (
          <section className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, staff no, department or designation"
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
                      <th className="px-4 py-3 font-medium">Department</th>
                      <th className="px-4 py-3 font-medium">Designation</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      {isAdminOrHr && (
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={isAdminOrHr ? 7 : 6} className="px-4 py-8 text-center text-muted-foreground">
                          Loading…
                        </td>
                      </tr>
                    ) : filteredStaff.length === 0 ? (
                      <tr>
                        <td colSpan={isAdminOrHr ? 7 : 6} className="px-4 py-8 text-center text-muted-foreground">
                          No staff records found.
                        </td>
                      </tr>
                    ) : (
                      filteredStaff.map((s) => (
                        <tr key={s.id} className="border-t border-border">
                          <td className="px-4 py-3 font-mono text-xs">{s.staff_no}</td>
                          <td className="px-4 py-3 font-medium">{s.full_name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.department ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.designation ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.phone ?? "—"}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={s.status} />
                          </td>
                          {isAdminOrHr && (
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex gap-1">
                                <button
                                  onClick={() => openEditStaff(s)}
                                  className="rounded-md p-2 hover:bg-accent"
                                  aria-label="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => removeStaff(s)}
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
          </section>
        )}

        {tab === "leave" && (
          <section className="space-y-4">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">Staff</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Dates</th>
                      <th className="px-4 py-3 font-medium">Days</th>
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
                    ) : leave.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          No leave requests yet.
                        </td>
                      </tr>
                    ) : (
                      leave.map((l) => (
                        <tr key={l.id} className="border-t border-border">
                          <td className="px-4 py-3">
                            <p className="font-medium">{l.staff?.full_name ?? "—"}</p>
                            <p className="text-xs text-muted-foreground font-mono">{l.staff?.staff_no ?? "—"}</p>
                          </td>
                          <td className="px-4 py-3 capitalize">{l.leave_type}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {l.start_date} → {l.end_date}
                          </td>
                          <td className="px-4 py-3">{leaveDays(l.start_date, l.end_date)}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={l.status} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex gap-1">
                              <button
                                onClick={() => openEditLeave(l)}
                                className="rounded-md p-2 hover:bg-accent"
                                aria-label="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => removeLeave(l)}
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
          </section>
        )}
      </main>

      {staffOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setStaffOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveStaff}
            className="w-full max-w-lg rounded-xl border border-border bg-card p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingStaff ? "Edit staff" : "Add staff"}
              </h2>
              <button
                type="button"
                onClick={() => setStaffOpen(false)}
                className="rounded-md p-1 hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Staff No *">
                <input
                  required
                  value={staffForm.staff_no}
                  onChange={(e) => setStaffForm({ ...staffForm, staff_no: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Full name *">
                <input
                  required
                  value={staffForm.full_name}
                  onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={staffForm.email ?? ""}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Phone">
                <input
                  value={staffForm.phone ?? ""}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Department">
                <input
                  value={staffForm.department ?? ""}
                  onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
                  placeholder="e.g. Administration, Finance"
                  className={inputCls}
                />
              </Field>
              <Field label="Designation">
                <input
                  value={staffForm.designation ?? ""}
                  onChange={(e) => setStaffForm({ ...staffForm, designation: e.target.value })}
                  placeholder="e.g. Accountant, Librarian"
                  className={inputCls}
                />
              </Field>
              <Field label="Hire date">
                <input
                  type="date"
                  value={staffForm.hire_date ?? ""}
                  onChange={(e) => setStaffForm({ ...staffForm, hire_date: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Status">
                <select
                  value={staffForm.status}
                  onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value })}
                  className={inputCls}
                >
                  <option value="active">Active</option>
                  <option value="on_leave">On leave</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </Field>
              <Field label="Notes" className="sm:col-span-2">
                <textarea
                  rows={2}
                  value={staffForm.notes ?? ""}
                  onChange={(e) => setStaffForm({ ...staffForm, notes: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>

            {err && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{err}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStaffOpen(false)}
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

      {leaveOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setLeaveOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveLeave}
            className="w-full max-w-lg rounded-xl border border-border bg-card p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingLeave ? "Edit leave request" : "Request leave"}
              </h2>
              <button
                type="button"
                onClick={() => setLeaveOpen(false)}
                className="rounded-md p-1 hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Staff *" className="sm:col-span-2">
                <select
                  required
                  value={leaveForm.staff_id}
                  disabled={!isAdminOrHr}
                  onChange={(e) => setLeaveForm({ ...leaveForm, staff_id: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Select staff</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.staff_no})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Leave type *">
                <select
                  required
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                  className={inputCls}
                >
                  <option value="annual">Annual</option>
                  <option value="sick">Sick</option>
                  <option value="maternity">Maternity</option>
                  <option value="paternity">Paternity</option>
                  <option value="casual">Casual</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={leaveForm.status}
                  onChange={(e) => setLeaveForm({ ...leaveForm, status: e.target.value })}
                  disabled={!isAdminOrHr && leaveForm.status !== "pending"}
                  className={inputCls}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </Field>
              <Field label="Start date *">
                <input
                  type="date"
                  required
                  value={leaveForm.start_date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="End date *">
                <input
                  type="date"
                  required
                  value={leaveForm.end_date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Reason" className="sm:col-span-2">
                <textarea
                  rows={2}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>

            {err && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{err}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLeaveOpen(false)}
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
    status === "active" || status === "approved"
      ? "bg-primary/10 text-primary"
      : status === "pending"
      ? "bg-yellow-500/10 text-yellow-600"
      : status === "on_leave"
      ? "bg-blue-500/10 text-blue-600"
      : status === "inactive" || status === "rejected" || status === "cancelled" || status === "suspended"
      ? "bg-muted text-muted-foreground"
      : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs capitalize ${style}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
