import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Pencil, Trash2, X, Bus, MapPin, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/transport")({
  head: () => ({
    meta: [
      { title: "Transport | Ummina Aisha School" },
      {
        name: "description",
        content:
          "Manage school buses, transport routes, pickup stops and student bus assignments.",
      },
      { property: "og:title", content: "Transport | Ummina Aisha School" },
      {
        property: "og:description",
        content: "Vehicles, routes, stops and student bus assignments for Ummina Aisha School.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TransportPage,
});

type Vehicle = {
  id: string;
  plate_number: string;
  model: string | null;
  capacity: number;
  driver_name: string | null;
  driver_phone: string | null;
  status: string;
  notes: string | null;
};

type TRoute = {
  id: string;
  name: string;
  description: string | null;
  fare_per_term: number;
  vehicle_id: string | null;
  status: string;
};

type Stop = {
  id: string;
  route_id: string;
  name: string;
  pickup_time: string | null;
  sort_order: number;
};

type Assignment = {
  id: string;
  student_id: string;
  route_id: string;
  stop_id: string | null;
  start_date: string;
  status: string;
  notes: string | null;
};

type StudentRow = { id: string; full_name: string; admission_no: string };

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

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const emptyVehicle = {
  plate_number: "",
  model: "",
  capacity: 0,
  driver_name: "",
  driver_phone: "",
  status: "active",
  notes: "",
};

const emptyRoute = {
  name: "",
  description: "",
  fare_per_term: 0,
  vehicle_id: "",
  status: "active",
};

const naira = (n: number) =>
  `₦${Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

function TransportPage() {
  const [tab, setTab] = useState<"vehicles" | "routes" | "students">("vehicles");
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<TRoute[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);

  const [vOpen, setVOpen] = useState(false);
  const [vEditing, setVEditing] = useState<Vehicle | null>(null);
  const [vForm, setVForm] = useState(emptyVehicle);

  const [rOpen, setROpen] = useState(false);
  const [rEditing, setREditing] = useState<TRoute | null>(null);
  const [rForm, setRForm] = useState(emptyRoute);

  const [sOpen, setSOpen] = useState(false);
  const [sForm, setSForm] = useState({ route_id: "", name: "", pickup_time: "", sort_order: 0 });

  const [aOpen, setAOpen] = useState(false);
  const [aForm, setAForm] = useState({
    student_id: "",
    route_id: "",
    stop_id: "",
    start_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data: r } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      const roles = (r ?? []).map((x) => x.role as string);
      setIsStaff(roles.includes("admin") || roles.includes("transport_manager"));
    }
    const [{ data: v }, { data: rt }, { data: st }, { data: as }, { data: stu }] =
      await Promise.all([
        supabase.from("vehicles").select("*").order("plate_number"),
        supabase.from("transport_routes").select("*").order("name"),
        supabase.from("route_stops").select("*").order("sort_order"),
        supabase.from("student_transport").select("*").order("created_at", { ascending: false }),
        supabase.from("students").select("id, full_name, admission_no").order("full_name"),
      ]);
    setVehicles((v ?? []) as Vehicle[]);
    setRoutes((rt ?? []) as TRoute[]);
    setStops((st ?? []) as Stop[]);
    setAssignments((as ?? []) as Assignment[]);
    setStudents((stu ?? []) as StudentRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  /* ---------- vehicles ---------- */
  async function saveVehicle(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const payload = {
      plate_number: vForm.plate_number.trim(),
      model: vForm.model || null,
      capacity: Number(vForm.capacity) || 0,
      driver_name: vForm.driver_name || null,
      driver_phone: vForm.driver_phone || null,
      status: vForm.status,
      notes: vForm.notes || null,
    };
    const res = vEditing
      ? await supabase.from("vehicles").update(payload).eq("id", vEditing.id)
      : await supabase.from("vehicles").insert(payload);
    setSaving(false);
    if (res.error) {
      setErr(res.error.message);
      return;
    }
    setVOpen(false);
    await load();
  }

  async function deleteVehicle(v: Vehicle) {
    if (!confirm(`Delete vehicle ${v.plate_number}?`)) return;
    const { error } = await supabase.from("vehicles").delete().eq("id", v.id);
    if (error) alert(error.message);
    await load();
  }

  /* ---------- routes ---------- */
  async function saveRoute(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const payload = {
      name: rForm.name.trim(),
      description: rForm.description || null,
      fare_per_term: Number(rForm.fare_per_term) || 0,
      vehicle_id: rForm.vehicle_id || null,
      status: rForm.status,
    };
    const res = rEditing
      ? await supabase.from("transport_routes").update(payload).eq("id", rEditing.id)
      : await supabase.from("transport_routes").insert(payload);
    setSaving(false);
    if (res.error) {
      setErr(res.error.message);
      return;
    }
    setROpen(false);
    await load();
  }

  async function deleteRoute(r: TRoute) {
    if (!confirm(`Delete route "${r.name}" and its stops?`)) return;
    const { error } = await supabase.from("transport_routes").delete().eq("id", r.id);
    if (error) alert(error.message);
    await load();
  }

  /* ---------- stops ---------- */
  async function saveStop(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const { error } = await supabase.from("route_stops").insert({
      route_id: sForm.route_id,
      name: sForm.name.trim(),
      pickup_time: sForm.pickup_time || null,
      sort_order: Number(sForm.sort_order) || 0,
    });
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setSOpen(false);
    await load();
  }

  async function deleteStop(s: Stop) {
    if (!confirm(`Remove stop "${s.name}"?`)) return;
    const { error } = await supabase.from("route_stops").delete().eq("id", s.id);
    if (error) alert(error.message);
    await load();
  }

  /* ---------- assignments ---------- */
  async function saveAssignment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const { error } = await supabase.from("student_transport").insert({
      student_id: aForm.student_id,
      route_id: aForm.route_id,
      stop_id: aForm.stop_id || null,
      start_date: aForm.start_date,
      notes: aForm.notes || null,
      status: "active",
    });
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setAOpen(false);
    await load();
  }

  async function toggleAssignment(a: Assignment) {
    const { error } = await supabase
      .from("student_transport")
      .update({ status: a.status === "active" ? "inactive" : "active" })
      .eq("id", a.id);
    if (error) alert(error.message);
    await load();
  }

  async function deleteAssignment(a: Assignment) {
    if (!confirm("Remove this student from transport?")) return;
    const { error } = await supabase.from("student_transport").delete().eq("id", a.id);
    if (error) alert(error.message);
    await load();
  }

  const vehicleLabel = (id: string | null) =>
    vehicles.find((v) => v.id === id)?.plate_number ?? "—";
  const routeLabel = (id: string) => routes.find((r) => r.id === id)?.name ?? "—";
  const stopLabel = (id: string | null) => stops.find((s) => s.id === id)?.name ?? "—";
  const studentLabel = (id: string) => {
    const s = students.find((x) => x.id === id);
    return s ? `${s.full_name} (${s.admission_no})` : "—";
  };

  const activeRiders = assignments.filter((a) => a.status === "active").length;
  const seats = vehicles.reduce((sum, v) => sum + (v.capacity || 0), 0);

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
          {isStaff && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setAForm({
                    student_id: "",
                    route_id: "",
                    stop_id: "",
                    start_date: new Date().toISOString().slice(0, 10),
                    notes: "",
                  });
                  setErr(null);
                  setAOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
              >
                <Users className="h-4 w-4" /> Assign student
              </button>
              <button
                onClick={() => {
                  setREditing(null);
                  setRForm(emptyRoute);
                  setErr(null);
                  setROpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
              >
                <MapPin className="h-4 w-4" /> Add route
              </button>
              <button
                onClick={() => {
                  setVEditing(null);
                  setVForm(emptyVehicle);
                  setErr(null);
                  setVOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> Add vehicle
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transport</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Buses, drivers, routes with pickup stops, and student bus assignments.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Vehicles", value: vehicles.length },
            { label: "Total seats", value: seats },
            { label: "Routes", value: routes.length },
            { label: "Riders", value: activeRiders },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">{k.label}</p>
              <p className="mt-2 text-2xl font-semibold">{k.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1 rounded-lg border border-border bg-card p-1 w-fit">
          {(["vehicles", "routes", "students"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-4 py-2 text-sm capitalize ${
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : tab === "vehicles" ? (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Plate</th>
                  <th className="px-4 py-3 font-medium">Model</th>
                  <th className="px-4 py-3 font-medium">Capacity</th>
                  <th className="px-4 py-3 font-medium">Driver</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  {isStaff && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No vehicles yet.
                    </td>
                  </tr>
                )}
                {vehicles.map((v) => (
                  <tr key={v.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">
                      <span className="inline-flex items-center gap-2">
                        <Bus className="h-4 w-4 text-primary" /> {v.plate_number}
                      </span>
                    </td>
                    <td className="px-4 py-3">{v.model ?? "—"}</td>
                    <td className="px-4 py-3">{v.capacity}</td>
                    <td className="px-4 py-3">
                      {v.driver_name ?? "—"}
                      {v.driver_phone ? (
                        <span className="block text-xs text-muted-foreground">
                          {v.driver_phone}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 capitalize">{v.status}</td>
                    {isStaff && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setVEditing(v);
                            setVForm({
                              plate_number: v.plate_number,
                              model: v.model ?? "",
                              capacity: v.capacity,
                              driver_name: v.driver_name ?? "",
                              driver_phone: v.driver_phone ?? "",
                              status: v.status,
                              notes: v.notes ?? "",
                            });
                            setErr(null);
                            setVOpen(true);
                          }}
                          className="mr-2 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteVehicle(v)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === "routes" ? (
          <div className="space-y-4">
            {routes.length === 0 && (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No routes yet.
              </div>
            )}
            {routes.map((r) => {
              const rs = stops.filter((s) => s.route_id === r.id);
              const riders = assignments.filter(
                (a) => a.route_id === r.id && a.status === "active",
              ).length;
              return (
                <div key={r.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Bus {vehicleLabel(r.vehicle_id)} · {naira(r.fare_per_term)}/term · {riders}{" "}
                        rider{riders === 1 ? "" : "s"} · <span className="capitalize">{r.status}</span>
                      </p>
                      {r.description && (
                        <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>
                      )}
                    </div>
                    {isStaff && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSForm({
                              route_id: r.id,
                              name: "",
                              pickup_time: "",
                              sort_order: rs.length + 1,
                            });
                            setErr(null);
                            setSOpen(true);
                          }}
                          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-accent"
                        >
                          Add stop
                        </button>
                        <button
                          onClick={() => {
                            setREditing(r);
                            setRForm({
                              name: r.name,
                              description: r.description ?? "",
                              fare_per_term: r.fare_per_term,
                              vehicle_id: r.vehicle_id ?? "",
                              status: r.status,
                            });
                            setErr(null);
                            setROpen(true);
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteRoute(r)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <ul className="mt-4 space-y-1">
                    {rs.length === 0 && (
                      <li className="text-xs text-muted-foreground">No stops added.</li>
                    )}
                    {rs.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-2 text-sm"
                      >
                        <span className="inline-flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          {s.sort_order}. {s.name}
                          {s.pickup_time && (
                            <span className="text-xs text-muted-foreground">
                              {s.pickup_time.slice(0, 5)}
                            </span>
                          )}
                        </span>
                        {isStaff && (
                          <button
                            onClick={() => deleteStop(s)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Route</th>
                  <th className="px-4 py-3 font-medium">Stop</th>
                  <th className="px-4 py-3 font-medium">Since</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  {isStaff && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No students assigned to transport yet.
                    </td>
                  </tr>
                )}
                {assignments.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{studentLabel(a.student_id)}</td>
                    <td className="px-4 py-3">{routeLabel(a.route_id)}</td>
                    <td className="px-4 py-3">{stopLabel(a.stop_id)}</td>
                    <td className="px-4 py-3">{a.start_date}</td>
                    <td className="px-4 py-3 capitalize">{a.status}</td>
                    {isStaff && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => toggleAssignment(a)}
                          className="mr-3 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {a.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => deleteAssignment(a)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {vOpen && (
        <Modal
          title={vEditing ? "Edit vehicle" : "Add vehicle"}
          onClose={() => setVOpen(false)}
        >
          <form onSubmit={saveVehicle} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Plate number">
                <input
                  required
                  className={inputCls}
                  value={vForm.plate_number}
                  onChange={(e) => setVForm({ ...vForm, plate_number: e.target.value })}
                />
              </Field>
              <Field label="Model">
                <input
                  className={inputCls}
                  value={vForm.model}
                  onChange={(e) => setVForm({ ...vForm, model: e.target.value })}
                />
              </Field>
              <Field label="Capacity">
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={vForm.capacity}
                  onChange={(e) => setVForm({ ...vForm, capacity: Number(e.target.value) })}
                />
              </Field>
              <Field label="Status">
                <select
                  className={inputCls}
                  value={vForm.status}
                  onChange={(e) => setVForm({ ...vForm, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
              </Field>
              <Field label="Driver name">
                <input
                  className={inputCls}
                  value={vForm.driver_name}
                  onChange={(e) => setVForm({ ...vForm, driver_name: e.target.value })}
                />
              </Field>
              <Field label="Driver phone">
                <input
                  className={inputCls}
                  value={vForm.driver_phone}
                  onChange={(e) => setVForm({ ...vForm, driver_phone: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Notes">
              <textarea
                rows={2}
                className={inputCls}
                value={vForm.notes}
                onChange={(e) => setVForm({ ...vForm, notes: e.target.value })}
              />
            </Field>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <button
              disabled={saving}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save vehicle"}
            </button>
          </form>
        </Modal>
      )}

      {rOpen && (
        <Modal title={rEditing ? "Edit route" : "Add route"} onClose={() => setROpen(false)}>
          <form onSubmit={saveRoute} className="space-y-3">
            <Field label="Route name">
              <input
                required
                className={inputCls}
                value={rForm.name}
                onChange={(e) => setRForm({ ...rForm, name: e.target.value })}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Fare per term (₦)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputCls}
                  value={rForm.fare_per_term}
                  onChange={(e) =>
                    setRForm({ ...rForm, fare_per_term: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Vehicle">
                <select
                  className={inputCls}
                  value={rForm.vehicle_id}
                  onChange={(e) => setRForm({ ...rForm, vehicle_id: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate_number}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Status">
              <select
                className={inputCls}
                value={rForm.status}
                onChange={(e) => setRForm({ ...rForm, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <Field label="Description">
              <textarea
                rows={2}
                className={inputCls}
                value={rForm.description}
                onChange={(e) => setRForm({ ...rForm, description: e.target.value })}
              />
            </Field>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <button
              disabled={saving}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save route"}
            </button>
          </form>
        </Modal>
      )}

      {sOpen && (
        <Modal title="Add stop" onClose={() => setSOpen(false)}>
          <form onSubmit={saveStop} className="space-y-3">
            <Field label="Route">
              <select
                required
                className={inputCls}
                value={sForm.route_id}
                onChange={(e) => setSForm({ ...sForm, route_id: e.target.value })}
              >
                <option value="">Select route…</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Stop name">
              <input
                required
                className={inputCls}
                value={sForm.name}
                onChange={(e) => setSForm({ ...sForm, name: e.target.value })}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Pickup time">
                <input
                  type="time"
                  className={inputCls}
                  value={sForm.pickup_time}
                  onChange={(e) => setSForm({ ...sForm, pickup_time: e.target.value })}
                />
              </Field>
              <Field label="Order">
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={sForm.sort_order}
                  onChange={(e) => setSForm({ ...sForm, sort_order: Number(e.target.value) })}
                />
              </Field>
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <button
              disabled={saving}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Add stop"}
            </button>
          </form>
        </Modal>
      )}

      {aOpen && (
        <Modal title="Assign student to transport" onClose={() => setAOpen(false)}>
          <form onSubmit={saveAssignment} className="space-y-3">
            <Field label="Student">
              <select
                required
                className={inputCls}
                value={aForm.student_id}
                onChange={(e) => setAForm({ ...aForm, student_id: e.target.value })}
              >
                <option value="">Select student…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.admission_no})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Route">
              <select
                required
                className={inputCls}
                value={aForm.route_id}
                onChange={(e) => setAForm({ ...aForm, route_id: e.target.value, stop_id: "" })}
              >
                <option value="">Select route…</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Pickup stop">
              <select
                className={inputCls}
                value={aForm.stop_id}
                onChange={(e) => setAForm({ ...aForm, stop_id: e.target.value })}
              >
                <option value="">No specific stop</option>
                {stops
                  .filter((s) => s.route_id === aForm.route_id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Start date">
              <input
                type="date"
                className={inputCls}
                value={aForm.start_date}
                onChange={(e) => setAForm({ ...aForm, start_date: e.target.value })}
              />
            </Field>
            <Field label="Notes">
              <textarea
                rows={2}
                className={inputCls}
                value={aForm.notes}
                onChange={(e) => setAForm({ ...aForm, notes: e.target.value })}
              />
            </Field>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <button
              disabled={saving}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Assign"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
