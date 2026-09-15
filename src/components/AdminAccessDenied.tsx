import { Link } from "@tanstack/react-router";

export function AdminAccessDenied({ loading = false }: { loading?: boolean }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center px-6 py-4">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            Return to dashboard
          </Link>
        </div>
      </header>
      <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-6 py-12">
        <div className="w-full rounded-xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold">
            {loading ? "Checking access…" : "Administrator access required"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {loading
              ? "Please wait while we confirm your account permissions."
              : "This management area is available only to school administrators."}
          </p>
          {!loading && (
            <Link
              to="/dashboard"
              className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Go to dashboard
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}