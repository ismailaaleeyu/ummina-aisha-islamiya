import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({
    meta: [
      { title: "Events & Calendar | Ummina Aisha School" },
      {
        name: "description",
        content: "View school events and manage the Ummina Aisha School calendar.",
      },
      { property: "og:title", content: "Events & Calendar | Ummina Aisha School" },
      {
        property: "og:description",
        content: "A shared calendar of school events, gatherings and important dates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EventsPage,
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
type SchoolEvent = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  audience: Role[];
  published: boolean;
  created_by: string | null;
};
type EventForm = {
  title: string;
  description: string;
  category: string;
  location: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  audience: Role[];
  published: boolean;
};

const CATEGORIES = ["general", "academic", "islamic", "holiday", "meeting", "sports", "other"];
const EMPTY_FORM: EventForm = {
  title: "",
  description: "",
  category: "general",
  location: "",
  start_at: "",
  end_at: "",
  all_day: false,
  audience: [],
  published: true,
};
const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function monthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, index) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + index),
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function EventsPage() {
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolEvent | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id ?? null;
    setUserId(uid);
    const [{ data: rows, error: eventsError }, { data: roleRows }] = await Promise.all([
      supabase.from("school_events").select("*").order("start_at", { ascending: true }),
      uid ? supabase.from("user_roles").select("role").eq("user_id", uid) : Promise.resolve({ data: [] }),
    ]);
    if (eventsError) setError(eventsError.message);
    setEvents((rows ?? []) as SchoolEvent[]);
    setRoles(((roleRows ?? []) as { role: string }[]).map((row) => row.role));
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const canCreate = roles.some((role) => ["admin", "teacher", "hr", "receptionist"].includes(role));
  const isAdmin = roles.includes("admin");
  const calendarDays = useMemo(() => monthGrid(month), [month]);
  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, SchoolEvent[]>();
    for (const event of events) {
      const key = dateKey(new Date(event.start_at));
      grouped.set(key, [...(grouped.get(key) ?? []), event]);
    }
    return grouped;
  }, [events]);
  const selectedEvents = eventsByDay.get(selectedDay) ?? [];

  function startNew() {
    const selectedDate = fromDateKey(selectedDay);
    selectedDate.setHours(9, 0, 0, 0);
    setEditing(null);
    setForm({ ...EMPTY_FORM, start_at: localDateTime(selectedDate.toISOString()) });
    setModalOpen(true);
  }

  function startEdit(event: SchoolEvent) {
    setEditing(event);
    setForm({
      title: event.title,
      description: event.description ?? "",
      category: event.category,
      location: event.location ?? "",
      start_at: localDateTime(event.start_at),
      end_at: localDateTime(event.end_at),
      all_day: event.all_day,
      audience: event.audience ?? [],
      published: event.published,
    });
    setModalOpen(true);
  }

  function toggleAudience(role: Role) {
    setForm((current) => ({
      ...current,
      audience: current.audience.includes(role)
        ? current.audience.filter((item) => item !== role)
        : [...current.audience, role],
    }));
  }

  async function saveEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const startAt = new Date(form.start_at);
    const endAt = form.end_at ? new Date(form.end_at) : null;
    if (Number.isNaN(startAt.getTime()) || (endAt && endAt < startAt)) {
      setError("Please choose a valid end time after the start time.");
      setSaving(false);
      return;
    }
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      location: form.location.trim() || null,
      start_at: startAt.toISOString(),
      end_at: endAt?.toISOString() ?? null,
      all_day: form.all_day,
      audience: form.audience,
      published: form.published,
    };
    const result = editing
      ? await supabase.from("school_events").update(payload).eq("id", editing.id)
      : await supabase.from("school_events").insert({ ...payload, created_by: userId });
    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }
    setModalOpen(false);
    setSaving(false);
    await load();
  }

  async function removeEvent(event: SchoolEvent) {
    if (!window.confirm(`Delete “${event.title}”?`)) return;
    const { error: deleteError } = await supabase.from("school_events").delete().eq("id", event.id);
    if (deleteError) setError(deleteError.message);
    else await load();
  }

  function changeMonth(offset: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next);
    setSelectedDay(dateKey(next));
  }

  const selectedDate = fromDateKey(selectedDay);
  const dateHeading = selectedDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          {canCreate && (
            <Button onClick={startNew}>
              <Plus /> <span className="hidden sm:inline">Add event</span><span className="sm:hidden">Add</span>
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-primary">
              <CalendarDays className="h-4 w-4" /> School life
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Events &amp; Calendar</h1>
            <p className="mt-1 text-sm text-muted-foreground">Important dates and gatherings at Ummina Aisha School.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
              Today
            </Button>
            <div className="flex items-center">
              <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => changeMonth(-1)}>
                <ChevronLeft />
              </Button>
              <span className="min-w-32 text-center text-sm font-semibold">
                {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </span>
              <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => changeMonth(1)}>
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-start justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span>{error}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setError(null)} aria-label="Dismiss error">
              <X />
            </Button>
          </div>
        )}

        <section className="grid overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 border-b border-border lg:border-b-0 lg:border-r">
            <div className="grid grid-cols-7 border-b border-border bg-muted/40">
              {weekdays.map((day) => (
                <div key={day} className="py-3 text-center text-xs font-semibold text-muted-foreground sm:text-sm">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day) => {
                const key = dateKey(day);
                const dayEvents = eventsByDay.get(key) ?? [];
                const isCurrentMonth = day.getMonth() === month.getMonth();
                const isSelected = key === selectedDay;
                const isToday = key === dateKey(new Date());
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDay(key)}
                    aria-label={`${day.toLocaleDateString()}, ${dayEvents.length} events`}
                    aria-pressed={isSelected}
                    className={`flex min-h-[72px] flex-col items-center border-b border-r border-border p-1.5 text-sm transition-colors last:border-r-0 hover:bg-accent/60 sm:min-h-24 sm:items-start sm:p-2 ${
                      isCurrentMonth ? "" : "text-muted-foreground/50"
                    } ${isSelected ? "bg-accent/70" : ""}`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs sm:text-sm ${isToday ? "bg-primary text-primary-foreground" : ""} ${isSelected && !isToday ? "font-semibold text-primary" : ""}`}>
                      {day.getDate()}
                    </span>
                    <span className="mt-1 flex max-w-full flex-wrap justify-center gap-1 sm:justify-start">
                      {dayEvents.slice(0, 3).map((item) => (
                        <span key={item.id} className={`h-1.5 w-1.5 rounded-full ${item.published ? "bg-primary" : "bg-muted-foreground"}`} />
                      ))}
                      {dayEvents.length > 3 && <span className="text-[10px] leading-none text-muted-foreground">+{dayEvents.length - 3}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">Selected day</p>
                <h2 className="mt-1 text-base font-semibold">{dateHeading}</h2>
              </div>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                {selectedEvents.length} {selectedEvents.length === 1 ? "event" : "events"}
              </span>
            </div>
            {loading ? (
              <p className="py-6 text-sm text-muted-foreground">Loading calendar…</p>
            ) : selectedEvents.length === 0 ? (
              <div className="py-8 text-center">
                <CalendarDays className="mx-auto h-7 w-7 text-muted-foreground/70" />
                <p className="mt-2 text-sm text-muted-foreground">No events on this day.</p>
                {canCreate && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={startNew}>
                    <Plus /> Add event
                  </Button>
                )}
              </div>
            ) : (
              <ul className="space-y-3">
                {selectedEvents.map((event) => {
                  const editable = isAdmin || event.created_by === userId;
                  return (
                    <li key={event.id} className="border-l-2 border-primary pl-3 py-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="break-words text-sm font-semibold">{event.title}</h3>
                            {!event.published && (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Draft</span>
                            )}
                          </div>
                          <p className="mt-1 text-xs capitalize text-muted-foreground">{event.category}</p>
                        </div>
                        {editable && (
                          <div className="flex shrink-0 items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${event.title}`} onClick={() => startEdit(event)}>
                              <Pencil />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label={`Delete ${event.title}`} onClick={() => void removeEvent(event)}>
                              <Trash2 />
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5 shrink-0" />
                        {event.all_day
                          ? "All day"
                          : new Date(event.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        {event.end_at && !event.all_day
                          ? ` – ${new Date(event.end_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                          : ""}
                      </p>
                      {event.location && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" /> {event.location}
                        </p>
                      )}
                      {event.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{event.description}</p>}
                      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {event.audience.length ? event.audience.map((role) => role.replace(/_/g, " ")).join(", ") : "Everyone"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
        </section>

        <p className="text-xs text-muted-foreground">Calendar times are shown in your device’s local time.</p>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 py-8" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setModalOpen(false);
        }}>
          <form onSubmit={saveEvent} className="w-full max-w-2xl space-y-5 rounded-lg border border-border bg-card p-5 shadow-lg sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">School calendar</p>
                <h2 className="mt-1 text-lg font-semibold">{editing ? "Edit event" : "Add an event"}</h2>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={() => setModalOpen(false)}>
                <X />
              </Button>
            </div>
            {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <Field label="Event name">
              <input required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className={inputClass}>
                  {CATEGORIES.map((category) => <option key={category} value={category}>{category[0].toUpperCase() + category.slice(1)}</option>)}
                </select>
              </Field>
              <Field label="Location">
                <input maxLength={160} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} className={inputClass} placeholder="Optional" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts">
                <input required type="datetime-local" value={form.start_at} onChange={(event) => setForm({ ...form, start_at: event.target.value })} className={inputClass} />
              </Field>
              <Field label="Ends (optional)">
                <input type="datetime-local" value={form.end_at} onChange={(event) => setForm({ ...form, end_at: event.target.value })} className={inputClass} />
              </Field>
            </div>
            <Field label="Details">
              <textarea rows={3} maxLength={3000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={inputClass} placeholder="Add helpful details for attendees" />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.all_day} onChange={(event) => setForm({ ...form, all_day: event.target.checked })} className="h-4 w-4 accent-primary" />
              All-day event
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Who can see this event?</legend>
              <p className="text-xs text-muted-foreground">Leave everyone unselected to share it with the whole school.</p>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((role) => {
                  const checked = form.audience.includes(role);
                  return (
                    <button key={role} type="button" aria-pressed={checked} onClick={() => toggleAudience(role)} className={`rounded-full border px-3 py-1.5 text-xs capitalize transition-colors ${checked ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent"}`}>
                      {role.replace(/_/g, " ")}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} className="h-4 w-4 accent-primary" />
              Publish event now
            </label>
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Save event"}</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}