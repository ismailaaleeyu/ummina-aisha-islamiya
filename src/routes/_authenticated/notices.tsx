import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, ArrowLeft, Search, X, Pin, Megaphone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notices")({
  head: () => ({
    meta: [
      { title: "Notice Board | Ummina Aisha School" },
      {
        name: "description",
        content:
          "Publish and read school announcements, targeted to staff, students or parents at Ummina Aisha School.",
      },
      { property: "og:title", content: "Notice Board | Ummina Aisha School" },
      {
        property: "og:description",
        content: "School-wide announcements and role-targeted notices for Ummina Aisha School.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NoticesPage,
});

const ROLES = [
  "admin",
  "teacher",
  "student",
  "parent",
  "accountant",
  "librarian",
  "hr",
  "receptionist",
  "transport_manager",
] as const;
type Role = (typeof ROLES)[number];

type Notice = {
  id: string;
  title: string;
  body: string;
  category: string;
  audience: Role[];
  priority: string;
  pinned: boolean;
  published: boolean;
  publish_at: string;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
};

const CATEGORIES = ["general", "academic", "finance", "event", "urgent"] as const;
const PRIORITIES = ["low", "normal", "high"] as const;

type FormState = {
  title: string;
  body: string;
  category: string;
  audience: Role[];
  priority: string;
  pinned: boolean;
  published: boolean;
  publish_at: string;
  expires_at: string;
};

const emptyForm: FormState = {
  title: "",
  body: "",
  category: "general",
  audience: [],
  priority: "normal",
  pinned: false,
  published: true,
  publish_at: "",
  expires_at: "",
};

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

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;
    setUserId(uid);
    const [{ data: n }, { data: r }] = await Promise.all([
      supabase
        .from("notices")
        .select("*")
        .order("pinned", { ascending: false })
        .order("publish_at", { ascending: false }),
      uid
        ? supabase.from("user_roles").select("role").eq("user_id", uid)
        : Promise.resolve({ data: [] as { role: string }[] }),
    ]);
    setNotices((n ?? []) as Notice[]);
    setRoles(((r ?? []) as { role: string }[]).map((x) => x.role));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const canPost =
    roles.includes("admin") ||
    roles.includes("teacher") ||
    roles.includes("hr") ||
    roles.includes("receptionist");
  const isAdmin = roles.includes("admin");

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm, publish_at: toLocalInput(new Date().toISOString()) });
    setErr(null);
    setOpen(true);
  }

  function openEdit(n: Notice) {
    setEditing(n);
    setForm({
      title: n.title,
      body: n.body,
      category: n.category,
      audience: n.audience ?? [],
      priority: n.priority,
      pinned: n.pinned,
      published: n.published,
      publish_at: toLocalInput(n.publish_at),
      expires_at: toLocalInput(n.expires_at),
    });
    setErr(null);
    setOpen(true);
  }

  function toggleAudience(role: Role) {
    setForm((f) => ({
      ...f,
      audience: f.audience.includes(role)
        ? f.audience.filter((x) => x !== role)
        : [...f.audience, role],
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      category: form.category,
      audience: form.audience,
      priority: form.priority,
      pinned: form.pinned,
      published: form.published,
      publish_at: form.publish_at
        ? new Date(form.publish_at).toISOString()
        : new Date().toISOString(),
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };
    const res = editing
      ? await supabase.from("notices").update(payload).eq("id", editing.id)
      : await supabase.from("notices").insert({ ...payload, created_by: userId });
    if (res.error) {
      setErr(res.error.message);
      setSaving(false);
      return;
    }
    setOpen(false);
    setSaving(false);
    await load();
  }

  async function remove(n: Notice) {
    if (!confirm(`Delete notice "${n.title}"?`)) return;
    const { error } = await supabase.from("notices").delete().eq("id", n.id);
    if (error) alert(error.message);
    else await load();
  }

  const s = q.toLowerCase();
  const filtered = notices.filter(
    (n) =>
      !s ||
      n.title.toLowerCase().includes(s) ||
      n.body.toLowerCase().includes(s) ||
      n.category.toLowerCase().includes(s),
  );

  const now = Date.now();
  const activeCount = notices.filter(
    (n) =>
      n.published &&
      new Date(n.publish_at).getTime() <= now &&
      (!n.expires_at || new Date(n.expires_at).getTime() > now),
  ).length;

  function statusOf(n: Notice) {
    if (!n.published) return { label: "Draft", cls: "bg-secondary text-secondary-foreground" };
    if (new Date(n.publish_at).getTime() > now)
      return { label: "Scheduled", cls: "bg-accent text-accent-foreground" };
    if (n.expires_at && new Date(n.expires_at).getTime() <= now)
      return { label: "Expired", cls: "bg-muted text-muted-foreground" };
    return { label: "Live", cls: "bg-primary/15 text-primary" };
  }

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
          {canPost && (
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> New notice
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notice Board</h1>
          <p className="text-sm text-muted-foreground mt-1">
            School announcements and notices, targeted to the people who need them.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Notices visible to you", value: notices.length },
            { label: "Currently live", value: activeCount },
            { label: "Pinned", value: notices.filter((n) => n.pinned).length },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">{k.label}</p>
              <p className="mt-2 text-2xl font-semibold">{k.value}</p>
            </div>
          ))}
        </div>

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notices"
            className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading notices…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-8 text-center">
            <Megaphone className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No notices yet{canPost ? " — publish the first announcement." : "."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((n) => {
              const st = statusOf(n);
              const mine = n.created_by && n.created_by === userId;
              return (
                <li key={n.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {n.pinned && <Pin className="h-4 w-4 text-primary" />}
                        <h2 className="text-base font-semibold">{n.title}</h2>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${st.cls}`}>
                          {st.label}
                        </span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize text-secondary-foreground">
                          {n.category}
                        </span>
                        {n.priority !== "normal" && (
                          <span className="rounded-full border border-border px-2 py-0.5 text-xs capitalize">
                            {n.priority} priority
                          </span>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                        {n.body}
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {new Date(n.publish_at).toLocaleString()}
                        {n.expires_at
                          ? ` · expires ${new Date(n.expires_at).toLocaleDateString()}`
                          : ""}
                        {" · "}
                        {n.audience.length
                          ? `for ${n.audience.map((r) => r.replace(/_/g, " ")).join(", ")}`
                          : "for everyone"}
                      </p>
                    </div>
                    {(isAdmin || mine) && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(n)}
                          className="rounded-md border border-input p-2 hover:bg-accent"
                          aria-label={`Edit ${n.title}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => remove(n)}
                          className="rounded-md border border-input p-2 text-destructive hover:bg-accent"
                          aria-label={`Delete ${n.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 py-10">
          <form
            onSubmit={save}
            className="w-full max-w-2xl space-y-4 rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing ? "Edit notice" : "New notice"}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 hover:bg-accent"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {err && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {err}
              </p>
            )}

            <Field label="Title">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputCls}
              />
            </Field>

            <Field label="Message">
              <textarea
                required
                rows={5}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className={inputCls}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Category">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={inputCls}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Priority">
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className={inputCls}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Publish at">
                <input
                  type="datetime-local"
                  value={form.publish_at}
                  onChange={(e) => setForm({ ...form, publish_at: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Expires at (optional)">
                <input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Audience (leave empty for everyone)
              </p>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => {
                  const on = form.audience.includes(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggleAudience(r)}
                      className={`rounded-full border px-3 py-1 text-xs capitalize ${
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input hover:bg-accent"
                      }`}
                    >
                      {r.replace(/_/g, " ")}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
                />
                Pin to top
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                />
                Published
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-input px-4 py-2 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? "Saving…" : editing ? "Save changes" : "Publish notice"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
