import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, ArrowLeft, Search, X, BookOpen, Undo2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Library | Ummina Aisha School" },
      {
        name: "description",
        content:
          "Manage the school library catalogue, issue books to students and track returns and overdue loans.",
      },
      { property: "og:title", content: "Library | Ummina Aisha School" },
      {
        property: "og:description",
        content: "Book catalogue, issuing and return tracking for Ummina Aisha School.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LibraryPage,
});

type Book = {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  category: string | null;
  publisher: string | null;
  total_copies: number;
  available_copies: number;
  shelf_location: string | null;
};

type Loan = {
  id: string;
  book_id: string;
  student_id: string;
  borrowed_at: string;
  due_date: string | null;
  returned_at: string | null;
  status: string;
  notes: string | null;
};

type StudentRow = { id: string; full_name: string; admission_no: string };

const emptyBook: Omit<Book, "id"> = {
  title: "",
  author: "",
  isbn: "",
  category: "",
  publisher: "",
  total_copies: 1,
  available_copies: 1,
  shelf_location: "",
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

function LibraryPage() {
  const [tab, setTab] = useState<"catalogue" | "loans">("catalogue");
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [bookOpen, setBookOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [form, setForm] = useState<Omit<Book, "id">>(emptyBook);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({
    book_id: "",
    student_id: "",
    due_date: "",
    notes: "",
  });

  async function load() {
    setLoading(true);
    const [{ data: b }, { data: l }, { data: s }] = await Promise.all([
      supabase.from("books").select("*").order("title", { ascending: true }),
      supabase.from("book_loans").select("*").order("borrowed_at", { ascending: false }),
      supabase
        .from("students")
        .select("id, full_name, admission_no")
        .order("full_name", { ascending: true }),
    ]);
    setBooks((b ?? []) as Book[]);
    setLoans((l ?? []) as Loan[]);
    setStudents((s ?? []) as StudentRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing(null);
    setForm(emptyBook);
    setErr(null);
    setBookOpen(true);
  }

  function openEdit(b: Book) {
    setEditing(b);
    const { id: _id, ...rest } = b;
    void _id;
    setForm(rest);
    setErr(null);
    setBookOpen(true);
  }

  async function saveBook(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const total = Number(form.total_copies) || 1;
    const payload = {
      title: form.title,
      author: form.author || null,
      isbn: form.isbn || null,
      category: form.category || null,
      publisher: form.publisher || null,
      shelf_location: form.shelf_location || null,
      total_copies: total,
      available_copies: editing
        ? Math.max(0, Math.min(Number(form.available_copies) || 0, total))
        : total,
    };
    const res = editing
      ? await supabase.from("books").update(payload).eq("id", editing.id)
      : await supabase.from("books").insert(payload);
    if (res.error) {
      setErr(res.error.message);
      setSaving(false);
      return;
    }
    setBookOpen(false);
    setSaving(false);
    await load();
  }

  async function removeBook(b: Book) {
    if (!confirm(`Remove "${b.title}" from the catalogue?`)) return;
    const { error } = await supabase.from("books").delete().eq("id", b.id);
    if (error) alert(error.message);
    else await load();
  }

  function openIssue(bookId?: string) {
    const due = new Date();
    due.setDate(due.getDate() + 14);
    setIssueForm({
      book_id: bookId ?? "",
      student_id: "",
      due_date: due.toISOString().slice(0, 10),
      notes: "",
    });
    setErr(null);
    setIssueOpen(true);
  }

  async function issueBook(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const book = books.find((b) => b.id === issueForm.book_id);
    if (!book || book.available_copies < 1) {
      setErr("No copies available for that title.");
      setSaving(false);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const res = await supabase.from("book_loans").insert({
      book_id: issueForm.book_id,
      student_id: issueForm.student_id,
      due_date: issueForm.due_date || null,
      notes: issueForm.notes || null,
      status: "borrowed",
      issued_by: userData.user?.id ?? null,
    });
    if (res.error) {
      setErr(res.error.message);
      setSaving(false);
      return;
    }
    await supabase
      .from("books")
      .update({ available_copies: book.available_copies - 1 })
      .eq("id", book.id);
    setIssueOpen(false);
    setSaving(false);
    setTab("loans");
    await load();
  }

  async function returnLoan(loan: Loan) {
    const book = books.find((b) => b.id === loan.book_id);
    const { error } = await supabase
      .from("book_loans")
      .update({ returned_at: new Date().toISOString().slice(0, 10), status: "returned" })
      .eq("id", loan.id);
    if (error) {
      alert(error.message);
      return;
    }
    if (book) {
      await supabase
        .from("books")
        .update({
          available_copies: Math.min(book.total_copies, book.available_copies + 1),
        })
        .eq("id", book.id);
    }
    await load();
  }

  const s = q.toLowerCase();
  const filteredBooks = books.filter(
    (b) =>
      !s ||
      b.title.toLowerCase().includes(s) ||
      (b.author ?? "").toLowerCase().includes(s) ||
      (b.category ?? "").toLowerCase().includes(s) ||
      (b.isbn ?? "").toLowerCase().includes(s),
  );

  const bookName = (id: string) => books.find((b) => b.id === id)?.title ?? "—";
  const studentName = (id: string) => students.find((x) => x.id === id)?.full_name ?? "—";
  const today = new Date().toISOString().slice(0, 10);

  const activeLoans = loans.filter((l) => !l.returned_at).length;
  const overdue = loans.filter(
    (l) => !l.returned_at && l.due_date && l.due_date < today,
  ).length;

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
          <div className="flex gap-2">
            <button
              onClick={() => openIssue()}
              className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
            >
              <BookOpen className="h-4 w-4" /> Issue book
            </button>
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Add book
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Catalogue, issue and return tracking for the school library.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Titles", value: books.length },
            { label: "On loan", value: activeLoans },
            { label: "Overdue", value: overdue },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">{k.label}</p>
              <p className="mt-2 text-2xl font-semibold">{k.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1 rounded-lg border border-border bg-card p-1 w-fit">
          {(["catalogue", "loans"] as const).map((t) => (
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

        {tab === "catalogue" && (
          <>
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by title, author, category or ISBN"
                className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">Author</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Shelf</th>
                      <th className="px-4 py-3 font-medium">Available</th>
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
                    ) : filteredBooks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          No books yet. Click "Add book" to build the catalogue.
                        </td>
                      </tr>
                    ) : (
                      filteredBooks.map((b) => (
                        <tr key={b.id} className="border-t border-border">
                          <td className="px-4 py-3 font-medium">{b.title}</td>
                          <td className="px-4 py-3 text-muted-foreground">{b.author ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{b.category ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {b.shelf_location ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                                b.available_copies > 0
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {b.available_copies} / {b.total_copies}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex gap-1">
                              <button
                                onClick={() => openIssue(b.id)}
                                disabled={b.available_copies < 1}
                                className="rounded-md px-2 py-1 text-xs hover:bg-accent disabled:opacity-40"
                              >
                                Issue
                              </button>
                              <button
                                onClick={() => openEdit(b)}
                                className="rounded-md p-2 hover:bg-accent"
                                aria-label="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => removeBook(b)}
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
          </>
        )}

        {tab === "loans" && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Book</th>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Borrowed</th>
                    <th className="px-4 py-3 font-medium">Due</th>
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
                  ) : loans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No loans recorded yet.
                      </td>
                    </tr>
                  ) : (
                    loans.map((l) => {
                      const isOverdue = !l.returned_at && l.due_date && l.due_date < today;
                      return (
                        <tr key={l.id} className="border-t border-border">
                          <td className="px-4 py-3 font-medium">{bookName(l.book_id)}</td>
                          <td className="px-4 py-3">{studentName(l.student_id)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{l.borrowed_at}</td>
                          <td className="px-4 py-3 text-muted-foreground">{l.due_date ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs capitalize ${
                                l.returned_at
                                  ? "bg-muted text-muted-foreground"
                                  : isOverdue
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-primary/10 text-primary"
                              }`}
                            >
                              {l.returned_at ? "returned" : isOverdue ? "overdue" : "borrowed"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {!l.returned_at && (
                              <button
                                onClick={() => returnLoan(l)}
                                className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs hover:bg-accent"
                              >
                                <Undo2 className="h-3 w-3" /> Return
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {bookOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setBookOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveBook}
            className="w-full max-w-lg rounded-xl border border-border bg-card p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing ? "Edit book" : "Add book"}</h2>
              <button
                type="button"
                onClick={() => setBookOpen(false)}
                className="rounded-md p-1 hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title *" className="sm:col-span-2">
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Author">
                <input
                  value={form.author ?? ""}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Category">
                <input
                  value={form.category ?? ""}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Tafsir, Hadith, Science"
                  className={inputCls}
                />
              </Field>
              <Field label="ISBN">
                <input
                  value={form.isbn ?? ""}
                  onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Publisher">
                <input
                  value={form.publisher ?? ""}
                  onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Shelf location">
                <input
                  value={form.shelf_location ?? ""}
                  onChange={(e) => setForm({ ...form, shelf_location: e.target.value })}
                  placeholder="e.g. A-3"
                  className={inputCls}
                />
              </Field>
              <Field label="Total copies">
                <input
                  type="number"
                  min={1}
                  value={form.total_copies}
                  onChange={(e) =>
                    setForm({ ...form, total_copies: Number(e.target.value) })
                  }
                  className={inputCls}
                />
              </Field>
              {editing && (
                <Field label="Available copies">
                  <input
                    type="number"
                    min={0}
                    value={form.available_copies}
                    onChange={(e) =>
                      setForm({ ...form, available_copies: Number(e.target.value) })
                    }
                    className={inputCls}
                  />
                </Field>
              )}
            </div>

            {err && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{err}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBookOpen(false)}
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

      {issueOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIssueOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={issueBook}
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Issue book</h2>
              <button
                type="button"
                onClick={() => setIssueOpen(false)}
                className="rounded-md p-1 hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <Field label="Book *">
              <select
                required
                value={issueForm.book_id}
                onChange={(e) => setIssueForm({ ...issueForm, book_id: e.target.value })}
                className={inputCls}
              >
                <option value="">Select a title</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id} disabled={b.available_copies < 1}>
                    {b.title} ({b.available_copies} available)
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Student *">
              <select
                required
                value={issueForm.student_id}
                onChange={(e) => setIssueForm({ ...issueForm, student_id: e.target.value })}
                className={inputCls}
              >
                <option value="">Select a student</option>
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.full_name} — {st.admission_no}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Due date">
              <input
                type="date"
                value={issueForm.due_date}
                onChange={(e) => setIssueForm({ ...issueForm, due_date: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Notes">
              <textarea
                rows={2}
                value={issueForm.notes}
                onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
                className={inputCls}
              />
            </Field>

            {err && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{err}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIssueOpen(false)}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Issuing…" : "Issue"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
