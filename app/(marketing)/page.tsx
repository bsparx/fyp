import Link from "next/link";
import { Stethoscope, FileText, Users, Database, ArrowRight, Shield, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col">
      {/* Hero Section */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-6 py-24 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-12 top-0 h-72 w-72 rounded-full bg-[#c4a882]/8 blur-3xl" />
          <div className="absolute -right-12 top-20 h-72 w-72 rounded-full bg-[#7a9eaf]/8 blur-3xl" />
          <div className="absolute left-1/2 bottom-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[#8fa68e]/8 blur-3xl" />
        </div>

        <div className="relative">
          <div className="flex items-center justify-center rounded-2xl bg-[#f0e6c8]/50 p-4 mb-8 border border-[#e5e0d8]">
            <Stethoscope className="h-10 w-10 text-[#8b7355]" />
          </div>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl text-[#3d3630]">
            Hospital Management System
          </h1>
          <p className="mt-6 max-w-xl text-lg text-[#8a8279] leading-relaxed">
            A powerful admin dashboard for managing users, uploading medical documents,
            and maintaining a semantic vector database for intelligent data retrieval.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row justify-center">
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#8b7355] px-8 text-sm font-medium text-[#faf6f1] transition-all hover:bg-[#6b5a42] hover:shadow-lg hover:shadow-[#8b7355]/15"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-12 items-center justify-center rounded-full border border-[#e5e0d8] bg-[#fdfcf9] px-8 text-sm font-medium text-[#3d3630] transition-all hover:bg-[#f0e6c8]/30 hover:border-[#c4a882]/40"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-[#e5e0d8] bg-[#faf6f1]/60 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-[#3d3630]">
              Admin Features
            </h2>
            <p className="mt-4 text-[#8a8279]">
              Everything you need to manage your hospital's data infrastructure
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="group rounded-2xl border border-[#e5e0d8] bg-[#fdfcf9] p-6 shadow-sm hover:shadow-md transition-all hover:border-[#c4a882]/30">
              <div className="rounded-xl bg-[#7a9eaf]/10 p-3 w-fit mb-4 group-hover:bg-[#7a9eaf]/15 transition-colors">
                <Users className="h-6 w-6 text-[#7a9eaf]" />
              </div>
              <h3 className="font-semibold text-[#3d3630]">User Management</h3>
              <p className="mt-2 text-sm text-[#8a8279] leading-relaxed">
                Add, edit, and manage user accounts with role-based access control.
              </p>
            </div>

            <div className="group rounded-2xl border border-[#e5e0d8] bg-[#fdfcf9] p-6 shadow-sm hover:shadow-md transition-all hover:border-[#c4a882]/30">
              <div className="rounded-xl bg-[#8fa68e]/10 p-3 w-fit mb-4 group-hover:bg-[#8fa68e]/15 transition-colors">
                <FileText className="h-6 w-6 text-[#8fa68e]" />
              </div>
              <h3 className="font-semibold text-[#3d3630]">Document Upload</h3>
              <p className="mt-2 text-sm text-[#8a8279] leading-relaxed">
                Upload PDF documents to be processed and indexed for semantic search.
              </p>
            </div>

            <div className="group rounded-2xl border border-[#e5e0d8] bg-[#fdfcf9] p-6 shadow-sm hover:shadow-md transition-all hover:border-[#c4a882]/30">
              <div className="rounded-xl bg-[#c49a6c]/10 p-3 w-fit mb-4 group-hover:bg-[#c49a6c]/15 transition-colors">
                <Database className="h-6 w-6 text-[#c49a6c]" />
              </div>
              <h3 className="font-semibold text-[#3d3630]">Vector Database</h3>
              <p className="mt-2 text-sm text-[#8a8279] leading-relaxed">
                Browse and search the semantic vector database for intelligent retrieval.
              </p>
            </div>

            <div className="group rounded-2xl border border-[#e5e0d8] bg-[#fdfcf9] p-6 shadow-sm hover:shadow-md transition-all hover:border-[#c4a882]/30">
              <div className="rounded-xl bg-[#8b7355]/10 p-3 w-fit mb-4 group-hover:bg-[#8b7355]/15 transition-colors">
                <Shield className="h-6 w-6 text-[#8b7355]" />
              </div>
              <h3 className="font-semibold text-[#3d3630]">Secure Access</h3>
              <p className="mt-2 text-sm text-[#8a8279] leading-relaxed">
                Enterprise-grade authentication and authorization with Clerk integration.
              </p>
            </div>

            <div className="group rounded-2xl border border-[#e5e0d8] bg-[#fdfcf9] p-6 shadow-sm hover:shadow-md transition-all hover:border-[#c4a882]/30">
              <div className="rounded-xl bg-[#b8907a]/10 p-3 w-fit mb-4 group-hover:bg-[#b8907a]/15 transition-colors">
                <Zap className="h-6 w-6 text-[#b8907a]" />
              </div>
              <h3 className="font-semibold text-[#3d3630]">Real-time Processing</h3>
              <p className="mt-2 text-sm text-[#8a8279] leading-relaxed">
                Automatic document parsing, OCR, and vector embedding generation.
              </p>
            </div>

            <div className="group rounded-2xl border border-[#e5e0d8] bg-[#fdfcf9] p-6 shadow-sm hover:shadow-md transition-all hover:border-[#c4a882]/30">
              <div className="rounded-xl bg-[#7a9eaf]/10 p-3 w-fit mb-4 group-hover:bg-[#7a9eaf]/15 transition-colors">
                <Stethoscope className="h-6 w-6 text-[#7a9eaf]" />
              </div>
              <h3 className="font-semibold text-[#3d3630]">Healthcare Ready</h3>
              <p className="mt-2 text-sm text-[#8a8279] leading-relaxed">
                Built for medical workflows with HIPAA-conscious data handling.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
