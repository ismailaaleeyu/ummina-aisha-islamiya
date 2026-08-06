import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { initializePayment, verifyPayment } from "@/lib/paystack.functions";
import { ArrowLeft, Plus, Trash2, Wallet, Receipt, CreditCard } from "lucide-react";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({ meta: [{ title: "Finance | Ummina Aisha School" }] }),
  component: FinancePage,
});

type FeeStructure = {
  id: string;
  name: string;
  amount: number;
  term: string | null;
  session: string | null;
  class_id: string | null;
  is_active: boolean;
};
type Invoice = {
  id: string;
  student_id: string;
  title: string;
  amount: number;
  amount_paid: number;
  status: "unpaid" | "partial" | "paid" | "cancelled";
  due_date: string | null;
  term: string | null;
  session: string | null;
  students?: { full_name: string; admission_no: string; user_id: string | null } | null;
};
type Payment = {
  id: string;
  invoice_id: string;
  amount: number;
  status: string;
  reference: string;
  paid_at: string | null;
  created_at: string;
};
type StudentLite = { id: string; full_name: string; admission_no: string; class_id: string | null };
type ClassLite = { id: string; name: string; section: string | null };

const naira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(n);

function FinancePage() {
  const [tab, setTab] = useState<"fees" | "invoices" | "payments">("invoices");
  const [roles, setRoles] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setUserId(data.user.id);
      setEmail(data.user.email ?? "");
      const { data: r } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      setRoles(((r ?? []) as { role: string }[]).map((x) => x.role));
    })();
  }, []);

  const isStaff = roles.some((r) => r === "admin" || r === "accountant");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Finance</h1>
              <p className="text-xs text-muted-foreground">Fees, invoices & Paystack payments</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        <div className="flex gap-2 border-b border-border">
          {(
            [
              { id: "invoices" as const, label: "Invoices", icon: Receipt, staffOnly: false },
              { id: "fees" as const, label: "Fee Structures", icon: Wallet, staffOnly: true },
              { id: "payments" as const, label: "Payments", icon: CreditCard, staffOnly: false },
            ]
          )
            .filter((t) => !t.staffOnly || isStaff)
            .map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm border-b-2 -mb-px ${
                  tab === t.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
        </div>

        {tab === "fees" && isStaff && <FeeStructuresPanel />}
        {tab === "invoices" && (
          <InvoicesPanel isStaff={isStaff} email={email} userId={userId} />
        )}
        {tab === "payments" && <PaymentsPanel isStaff={isStaff} />}
      </main>
    </div>
  );
}

/* ============ Fee Structures ============ */

function FeeStructuresPanel() {
  const [rows, setRows] = useState<FeeStructure[]>([]);
  const [classes, setClasses] = useState<ClassLite[]>([]);
  const [form, setForm] = useState({
    name: "",
    amount: "",
    term: "",
    session: "",
    class_id: "",
  });
  const [busy, setBusy] = useState(false);

  async function load() {
    const [{ data: f }, { data: c }] = await Promise.all([
      supabase
        .from("fee_structures")
        .select("id,name,amount,term,session,class_id,is_active")
        .order("created_at", { ascending: false }),
      supabase.from("classes").select("id,name,section").order("name"),
    ]);
    setRows((f ?? []) as FeeStructure[]);
    setClasses((c ?? []) as ClassLite[]);
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("fee_structures").insert({
      name: form.name,
      amount: Number(form.amount),
      term: form.term || null,
      session: form.session || null,
      class_id: form.class_id || null,
    });
    setBusy(false);
    if (error) return alert(error.message);
    setForm({ name: "", amount: "", term: "", session: "", class_id: "" });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this fee structure?")) return;
    const { error } = await supabase.from("fee_structures").delete().eq("id", id);
    if (error) return alert(error.message);
    load();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={create}
        className="rounded-xl border border-border bg-card p-5 grid gap-3 sm:grid-cols-6"
      >
        <input
          className="sm:col-span-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Fee name (e.g. Tuition)"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          type="number"
          step="0.01"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Amount (₦)"
          required
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <input
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Term"
          value={form.term}
          onChange={(e) => setForm({ ...form, term: e.target.value })}
        />
        <input
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Session"
          value={form.session}
          onChange={(e) => setForm({ ...form, session: e.target.value })}
        />
        <select
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={form.class_id}
          onChange={(e) => setForm({ ...form, class_id: e.target.value })}
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.section ?? ""}
            </option>
          ))}
        </select>
        <button
          disabled={busy}
          className="sm:col-span-6 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add fee structure
        </button>
      </form>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Term / Session</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No fee structures yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3">{naira(Number(r.amount))}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {[r.term, r.session].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {classes.find((c) => c.id === r.class_id)?.name ?? "All"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => remove(r.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ Invoices ============ */

function InvoicesPanel({
  isStaff,
  email,
  userId,
}: {
  isStaff: boolean;
  email: string;
  userId: string | null;
}) {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [fees, setFees] = useState<FeeStructure[]>([]);
  const [form, setForm] = useState({
    student_id: "",
    fee_structure_id: "",
    title: "",
    amount: "",
    due_date: "",
  });
  const [busy, setBusy] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const initPay = useServerFn(initializePayment);
  const verify = useServerFn(verifyPayment);

  async function load() {
    const [{ data: inv }, { data: s }, { data: f }] = await Promise.all([
      supabase
        .from("invoices")
        .select(
          "id,student_id,title,amount,amount_paid,status,due_date,term,session,students(full_name,admission_no,user_id)",
        )
        .order("created_at", { ascending: false }),
      supabase.from("students").select("id,full_name,admission_no,class_id").order("full_name"),
      supabase.from("fee_structures").select("id,name,amount,term,session,class_id,is_active"),
    ]);
    setRows((inv ?? []) as unknown as Invoice[]);
    setStudents((s ?? []) as StudentLite[]);
    setFees((f ?? []) as FeeStructure[]);
  }

  useEffect(() => {
    load();
  }, []);

  // Handle redirect back from Paystack (?reference=...)
  useEffect(() => {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("reference") || url.searchParams.get("trxref");
    if (!ref) return;
    (async () => {
      try {
        const res = await verify({ data: { reference: ref } });
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

  function pickFee(id: string) {
    const fee = fees.find((f) => f.id === id);
    setForm((prev) => ({
      ...prev,
      fee_structure_id: id,
      title: fee?.name ?? prev.title,
      amount: fee ? String(fee.amount) : prev.amount,
    }));
  }

  async function issue(e: React.FormEvent) {
    e.preventDefault();
    if (!form.student_id || !form.title || !form.amount) return;
    setBusy(true);
    const { error } = await supabase.from("invoices").insert({
      student_id: form.student_id,
      fee_structure_id: form.fee_structure_id || null,
      title: form.title,
      amount: Number(form.amount),
      due_date: form.due_date || null,
      issued_by: userId,
    });
    setBusy(false);
    if (error) return alert(error.message);
    setForm({ student_id: "", fee_structure_id: "", title: "", amount: "", due_date: "" });
    load();
  }

  async function pay(inv: Invoice) {
    setPayingId(inv.id);
    try {
      const callback = `${window.location.origin}/finance`;
      const res = await initPay({
        data: { invoice_id: inv.id, email, callback_url: callback },
      });
      window.location.href = res.authorization_url;
    } catch (e) {
      alert((e as Error).message);
      setPayingId(null);
    }
  }

  async function cancel(id: string) {
    if (!confirm("Cancel this invoice?")) return;
    const { error } = await supabase
      .from("invoices")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) return alert(error.message);
    load();
  }

  return (
    <div className="space-y-6">
      {isStaff && (
        <form
          onSubmit={issue}
          className="rounded-xl border border-border bg-card p-5 grid gap-3 sm:grid-cols-6"
        >
          <select
            required
            className="sm:col-span-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.student_id}
            onChange={(e) => setForm({ ...form, student_id: e.target.value })}
          >
            <option value="">Select student…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.admission_no} — {s.full_name}
              </option>
            ))}
          </select>
          <select
            className="sm:col-span-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.fee_structure_id}
            onChange={(e) => pickFee(e.target.value)}
          >
            <option value="">Custom / no template</option>
            {fees.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} — {naira(Number(f.amount))}
              </option>
            ))}
          </select>
          <input
            required
            className="sm:col-span-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="Invoice title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            required
            type="number"
            step="0.01"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="Amount (₦)"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <input
            type="date"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
          <button
            disabled={busy}
            className="sm:col-span-4 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Issue invoice
          </button>
        </form>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No invoices yet.
                </td>
              </tr>
            )}
            {rows.map((inv) => {
              const canPay =
                inv.status !== "paid" &&
                inv.status !== "cancelled" &&
                (isStaff || inv.students?.user_id === userId);
              return (
                <tr key={inv.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium">{inv.students?.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {inv.students?.admission_no ?? ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">{inv.title}</td>
                  <td className="px-4 py-3">{naira(Number(inv.amount))}</td>
                  <td className="px-4 py-3">{naira(Number(inv.amount_paid))}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs capitalize ${
                        inv.status === "paid"
                          ? "bg-primary/15 text-primary"
                          : inv.status === "partial"
                            ? "bg-amber-500/15 text-amber-700"
                            : inv.status === "cancelled"
                              ? "bg-muted text-muted-foreground"
                              : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.due_date ?? "—"}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {canPay && (
                      <button
                        disabled={payingId === inv.id}
                        onClick={() => pay(inv)}
                        className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        {payingId === inv.id ? "Redirecting…" : "Pay"}
                      </button>
                    )}
                    {isStaff && inv.status !== "cancelled" && (
                      <button
                        onClick={() => cancel(inv.id)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ Payments log ============ */

function PaymentsPanel({ isStaff }: { isStaff: boolean }) {
  const [rows, setRows] = useState<Payment[]>([]);
  const [checking, setChecking] = useState<string | null>(null);
  const verify = useServerFn(verifyPayment);

  function load() {
    supabase
      .from("payments")
      .select("id,invoice_id,amount,status,reference,paid_at,created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setRows((data ?? []) as Payment[]));
  }

  useEffect(() => {
    load();
  }, []);

  async function recheck(p: Payment) {
    setChecking(p.id);
    try {
      const res = await verify({ data: { reference: p.reference } });
      alert(
        res.status === "success"
          ? "Confirmed as paid ✅ — invoice updated."
          : "Provider reports this payment was not completed.",
      );
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setChecking(null);
      load();
    }
  }


  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Reference</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Paid at</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3" />

          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                {isStaff ? "No payments yet." : "No payments on your account yet."}
              </td>
            </tr>
          )}
          {rows.map((p) => (
            <tr key={p.id} className="border-t border-border">
              <td className="px-4 py-3 font-mono text-xs">{p.reference}</td>
              <td className="px-4 py-3">{naira(Number(p.amount))}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs capitalize ${
                    p.status === "success"
                      ? "bg-primary/15 text-primary"
                      : p.status === "pending"
                        ? "bg-amber-500/15 text-amber-700"
                        : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {p.status}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(p.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
