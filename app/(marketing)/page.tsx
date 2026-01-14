import Link from "next/link";
import { Hospital, FileText, Users, Database } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col">
      {/* Hero Section */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <div className="flex items-center justify-center rounded-full bg-primary/10 p-4 mb-6">
          <Hospital className="h-12 w-12 text-primary" />
        </div>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Hospital Management System
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          A powerful admin dashboard for managing users, uploading medical documents,
          and maintaining a semantic vector database for intelligent data retrieval.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex h-12 items-center justify-center rounded-full border border-input bg-background px-8 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Create Account
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/50 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Admin Features
          </h2>
          <p className="mt-4 text-center text-muted-foreground">
            Everything you need to manage your hospital&apos;s data infrastructure
          </p>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="rounded-lg bg-blue-500/10 p-3 w-fit">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="mt-4 font-semibold">User Management</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Add, edit, and manage user accounts with role-based access control.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="rounded-lg bg-green-500/10 p-3 w-fit">
                <FileText className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="mt-4 font-semibold">Document Upload</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload PDF documents to be processed and indexed for semantic search.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="rounded-lg bg-purple-500/10 p-3 w-fit">
                <Database className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="mt-4 font-semibold">Vector Database</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Browse and search the semantic vector database for intelligent retrieval.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
