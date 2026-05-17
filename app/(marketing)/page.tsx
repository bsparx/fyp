import Link from "next/link";
import { Stethoscope, FileText, Users, Database, ArrowRight, Shield, Zap } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-64px)] flex-col">
      {/* Hero Section */}
      <section aria-label="Hero" className="relative flex flex-1 flex-col items-center justify-center px-6 py-24 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-12 top-0 h-72 w-72 rounded-full bg-[#8aa4f0]/8 blur-3xl" />
          <div className="absolute -right-12 top-20 h-72 w-72 rounded-full bg-[#38bdf8]/8 blur-3xl" />
          <div className="absolute left-1/2 bottom-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[#4ade80]/8 blur-3xl" />
        </div>

        <div className="relative">
          <div className="flex items-center justify-center rounded-2xl bg-[#dbe4f5]/50 p-4 mb-8 border border-[#d0d9e8]">
            <Stethoscope className="h-10 w-10 text-[#5b7cfa]" />
          </div>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl text-[#1e2a3a]">
            Hospital Management System
          </h1>
          <p className="mt-6 max-w-xl text-lg text-[#6b7d99] leading-relaxed">
            A powerful admin dashboard for managing users, uploading medical documents,
            and maintaining a semantic vector database for intelligent data retrieval.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row justify-center">
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#5b7cfa] px-8 text-sm font-medium text-[#eef2f7] transition-all hover:bg-[#4a5fd9] hover:shadow-lg hover:shadow-[#5b7cfa]/15"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-12 items-center justify-center rounded-full border border-[#d0d9e8] bg-[#ffffff] px-8 text-sm font-medium text-[#1e2a3a] transition-all hover:bg-[#dbe4f5]/30 hover:border-[#8aa4f0]/40"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-[#d0d9e8] bg-[#eef2f7]/60 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-[#1e2a3a]">
              Admin Features
            </h2>
            <p className="mt-4 text-[#6b7d99]">
              Everything you need to manage your hospital's data infrastructure
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <article className="group rounded-2xl border border-[#d0d9e8] bg-[#ffffff] p-6 shadow-sm hover:shadow-md transition-all hover:border-[#8aa4f0]/30">
              <div className="rounded-xl bg-[#38bdf8]/10 p-3 w-fit mb-4 group-hover:bg-[#38bdf8]/15 transition-colors" aria-hidden="true">
                <Users className="h-6 w-6 text-[#38bdf8]" />
              </div>
              <h3 className="font-semibold text-[#1e2a3a]">User Management</h3>
              <p className="mt-2 text-sm text-[#6b7d99] leading-relaxed">
                Add, edit, and manage user accounts with role-based access control.
              </p>
            </article>

            <article className="group rounded-2xl border border-[#d0d9e8] bg-[#ffffff] p-6 shadow-sm hover:shadow-md transition-all hover:border-[#8aa4f0]/30">
              <div className="rounded-xl bg-[#4ade80]/10 p-3 w-fit mb-4 group-hover:bg-[#4ade80]/15 transition-colors" aria-hidden="true">
                <FileText className="h-6 w-6 text-[#4ade80]" />
              </div>
              <h3 className="font-semibold text-[#1e2a3a]">Document Upload</h3>
              <p className="mt-2 text-sm text-[#6b7d99] leading-relaxed">
                Upload PDF documents to be processed and indexed for semantic search.
              </p>
            </article>

            <article className="group rounded-2xl border border-[#d0d9e8] bg-[#ffffff] p-6 shadow-sm hover:shadow-md transition-all hover:border-[#8aa4f0]/30">
              <div className="rounded-xl bg-[#8aa4f0]/10 p-3 w-fit mb-4 group-hover:bg-[#8aa4f0]/15 transition-colors" aria-hidden="true">
                <Database className="h-6 w-6 text-[#8aa4f0]" />
              </div>
              <h3 className="font-semibold text-[#1e2a3a]">Vector Database</h3>
              <p className="mt-2 text-sm text-[#6b7d99] leading-relaxed">
                Browse and search the semantic vector database for intelligent retrieval.
              </p>
            </article>

            <article className="group rounded-2xl border border-[#d0d9e8] bg-[#ffffff] p-6 shadow-sm hover:shadow-md transition-all hover:border-[#8aa4f0]/30">
              <div className="rounded-xl bg-[#5b7cfa]/10 p-3 w-fit mb-4 group-hover:bg-[#5b7cfa]/15 transition-colors" aria-hidden="true">
                <Shield className="h-6 w-6 text-[#5b7cfa]" />
              </div>
              <h3 className="font-semibold text-[#1e2a3a]">Secure Access</h3>
              <p className="mt-2 text-sm text-[#6b7d99] leading-relaxed">
                Enterprise-grade authentication and authorization with Clerk integration.
              </p>
            </article>

            <article className="group rounded-2xl border border-[#d0d9e8] bg-[#ffffff] p-6 shadow-sm hover:shadow-md transition-all hover:border-[#8aa4f0]/30">
              <div className="rounded-xl bg-[#fbbf24]/10 p-3 w-fit mb-4 group-hover:bg-[#fbbf24]/15 transition-colors" aria-hidden="true">
                <Zap className="h-6 w-6 text-[#fbbf24]" />
              </div>
              <h3 className="font-semibold text-[#1e2a3a]">Real-time Processing</h3>
              <p className="mt-2 text-sm text-[#6b7d99] leading-relaxed">
                Automatic document parsing, OCR, and vector embedding generation.
              </p>
            </article>

            <article className="group rounded-2xl border border-[#d0d9e8] bg-[#ffffff] p-6 shadow-sm hover:shadow-md transition-all hover:border-[#8aa4f0]/30">
              <div className="rounded-xl bg-[#38bdf8]/10 p-3 w-fit mb-4 group-hover:bg-[#38bdf8]/15 transition-colors" aria-hidden="true">
                <Stethoscope className="h-6 w-6 text-[#38bdf8]" />
              </div>
              <h3 className="font-semibold text-[#1e2a3a]">Healthcare Ready</h3>
              <p className="mt-2 text-sm text-[#6b7d99] leading-relaxed">
                Built for medical workflows with HIPAA-conscious data handling.
              </p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
