import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { adminCreateUser } from "@/lib/admin-users.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  Settings as SettingsIcon,
  Palette,
  Users,
  UserCog,
  LogOut,
  Check,
  Save,
  Upload,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [{ title: "Settings | Ummina Aisha School" }],
  }),
  component: SettingsPage,
});

type Branding = {
  school_name: string;
  tagline: string | null;
  primary_color: string;
  accent_color: string;
  logo_url: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

type RoleRow = { role: string };

const ALL_ROLES = [
  "admin",
  "teacher",
  "student",
  "parent",
  "accountant",
  "librarian",
  "hr",
  "receptionist",
  "transport_manager",
];

function SettingsPage() {
  const [tab, setTab] = useState<"branding" | "users" | "account">("branding");
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, phone, avatar_url")
          .eq("id", u.user.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      setProfile(p as Profile | null);
      const roles = ((r ?? []) as RoleRow[]).map((x) => x.role);
      setIsAdmin(roles.includes("admin"));
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              UA
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Settings</p>
              <p className="text-xs text-muted-foreground">Ummina Aisha School</p>
            </div>
          </Link>
          <Link
            to="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure school branding, manage users & roles, and update your account.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          <TabButton
            active={tab === "branding"}
            onClick={() => setTab("branding")}
            icon={Palette}
            label="Branding"
            disabled={!isAdmin}
          />
          <TabButton
            active={tab === "users"}
            onClick={() => setTab("users")}
            icon={Users}
            label="Users & Roles"
            disabled={!isAdmin}
          />
          <TabButton
            active={tab === "account"}
            onClick={() => setTab("account")}
            icon={UserCog}
            label="My Account"
            disabled={false}
          />
        </div>

        {!isAdmin && tab !== "account" ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-6 text-sm text-muted-foreground">
            Only administrators can manage branding and users.
          </div>
        ) : tab === "branding" ? (
          <BrandingPanel />
        ) : tab === "users" ? (
          <UsersPanel />
        ) : (
          <AccountPanel profile={profile} email={email} />
        )}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

/* ----------------------------- Branding ----------------------------- */

function BrandingPanel() {
  const [b, setB] = useState<Branding | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from("branding")
      .select("school_name, tagline, primary_color, accent_color, logo_url")
      .eq("id", true)
      .maybeSingle()
      .then(({ data }) => setB(data as Branding | null));
  }, []);

  async function save() {
    if (!b) return;
    setSaving(true);
    setSaved(false);
    const { error } = await supabase
      .from("branding")
      .update({
        school_name: b.school_name,
        tagline: b.tagline,
        primary_color: b.primary_color,
        accent_color: b.accent_color,
        logo_url: b.logo_url,
      })
      .eq("id", true);
    setSaving(false);
    if (!error) {
      setSaved(true);
      // Apply colors live
      import("@/lib/use-branding").then(({ applyBrandingColors }) =>
        applyBrandingColors(b),
      );
      setTimeout(() => setSaved(false), 2500);
    } else {
      alert(error.message);
    }
  }

  if (!b) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">School Branding</h2>
        <p className="text-sm text-muted-foreground">
          These values appear across the landing page, sign-in, and dashboard.
        </p>

        <Field label="School name">
          <input
            value={b.school_name}
            onChange={(e) => setB({ ...b, school_name: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>

        <Field label="Tagline">
          <input
            value={b.tagline ?? ""}
            onChange={(e) => setB({ ...b, tagline: e.target.value })}
            placeholder="e.g. Yola, Nigeria"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Primary color (brand)">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={b.primary_color}
                onChange={(e) => setB({ ...b, primary_color: e.target.value })}
                className="h-9 w-12 rounded border border-input bg-background p-1"
              />
              <input
                value={b.primary_color}
                onChange={(e) => setB({ ...b, primary_color: e.target.value })}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </Field>
          <Field label="Accent color (surface tint)">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={b.accent_color}
                onChange={(e) => setB({ ...b, accent_color: e.target.value })}
                className="h-9 w-12 rounded border border-input bg-background p-1"
              />
              <input
                value={b.accent_color}
                onChange={(e) => setB({ ...b, accent_color: e.target.value })}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </Field>
        </div>

        <Field label="Logo URL (optional)">
          <input
            value={b.logo_url ?? ""}
            onChange={(e) => setB({ ...b, logo_url: e.target.value || null })}
            placeholder="https://…/logo.png"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save branding"}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm text-primary">
              <Check className="h-4 w-4" /> Saved — applied live
            </span>
          )}
        </div>
      </div>

      {/* Live preview */}
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground mb-3">
            Live preview
          </p>
          <div className="flex items-center gap-3">
            {b.logo_url ? (
              <img
                src={b.logo_url}
                alt="logo"
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg font-bold text-white"
                style={{ backgroundColor: b.primary_color }}
              >
                {(b.school_name || "UA")
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
            )}
            <div className="leading-tight">
              <p className="text-sm font-semibold">{b.school_name}</p>
              <p className="text-xs text-muted-foreground">{b.tagline}</p>
            </div>
          </div>
          <button
            className="mt-4 w-full rounded-md px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: b.primary_color }}
          >
            Primary button
          </button>
          <div
            className="mt-3 rounded-lg p-3 text-xs"
            style={{ backgroundColor: b.accent_color }}
          >
            Accent surface sample
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Users & Roles --------------------------- */

type UserRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  roles: { role: string }[];
};

function UsersPanel() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null); // `${userId}:${role}`
  const [showAdd, setShowAdd] = useState(false);
  const createUser = useServerFn(adminCreateUser);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    roles: ["student"] as string[],
  });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function load() {
    setLoading(true);
    supabase
      .from("profiles")
      .select("id, full_name, phone, user_roles(role)")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setRows((data ?? []) as unknown as UserRow[]);
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleRole(userId: string, role: string, has: boolean) {
    setBusy(`${userId}:${role}`);
    if (has) {
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role as never);
    } else {
      await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: role as never });
    }
    setBusy(null);
    load();
  }

  async function submitNewUser() {
    setCreating(true);
    setErr(null);
    setMsg(null);
    try {
      await createUser({
        data: {
          email: form.email.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          phone: form.phone.trim() || null,
          roles: form.roles,
        },
      });
      setMsg(`${form.email} created`);
      setForm({ email: "", password: "", fullName: "", phone: "", roles: ["student"] });
      setShowAdd(false);
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading users…</p>;


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Users & Roles</h2>
        <p className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "user" : "users"}
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Roles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium">
                  {u.full_name ?? <span className="text-muted-foreground">Unnamed</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_ROLES.map((role) => {
                      const has = u.roles?.some((r) => r.role === role);
                      return (
                        <button
                          key={role}
                          onClick={() => toggleRole(u.id, role, !!has)}
                          disabled={busy === `${u.id}:${role}`}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition disabled:opacity-50 ${
                            has
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                          }`}
                        >
                          {has && <Check className="h-3 w-3" />}
                          {role.replace(/_/g, " ")}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Click a role chip to grant or revoke it. Changes apply instantly.
      </p>
    </div>
  );
}

/* ----------------------------- My Account ----------------------------- */

function AccountPanel({ profile, email }: { profile: Profile | null; email: string }) {
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [profile]);

  async function save() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setSaving(true);
    setSaved(false);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName || null,
        phone: phone || null,
        avatar_url: avatarUrl || null,
      })
      .eq("id", u.user.id);
    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      alert(error.message);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <div className="max-w-lg space-y-4 rounded-xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">My Account</h2>
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
            {(fullName || email || "U").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="leading-tight">
          <p className="text-sm font-medium">{fullName || "Unnamed"}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>
      </div>

      <Field label="Full name">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </Field>
      <Field label="Phone">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </Field>
      <Field label="Avatar URL">
        <input
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://…/photo.jpg"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-primary">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
    </div>
  );
}
