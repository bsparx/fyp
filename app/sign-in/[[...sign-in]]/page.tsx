import { SignIn } from "@clerk/nextjs";
import { Stethoscope } from "lucide-react";

export default function Page() {
    return (
        <div className="relative flex min-h-screen items-center justify-center bg-[#eef2f7] px-4 py-10 overflow-hidden">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-[#8aa4f0]/10 blur-3xl" />
                <div className="absolute -left-12 bottom-0 h-56 w-56 rounded-full bg-[#38bdf8]/8 blur-3xl" />
                <div className="absolute -right-12 bottom-20 h-56 w-56 rounded-full bg-[#4ade80]/8 blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center rounded-2xl bg-[#dbe4f5]/50 p-3 mb-4 border border-[#d0d9e8] mx-auto w-fit" aria-hidden="true">
                        <Stethoscope className="h-8 w-8 text-[#5b7cfa]" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#1e2a3a]">Welcome back</h1>
                    <p className="mt-2 text-sm text-[#6b7d99]">Sign in to access the Hospital Management System</p>
                </div>

                <main className="p-6 rounded-2xl shadow-xl bg-[#ffffff] border border-[#d0d9e8]">
                    <SignIn
                        appearance={{
                            elements: {
                                card: "bg-transparent shadow-none",
                                headerTitle: "hidden",
                                headerSubtitle: "hidden",
                                socialButtonsBlockButton: "border-[#d0d9e8] bg-[#eef2f7] text-[#1e2a3a] hover:bg-[#dbe4f5]/30",
                                formFieldLabel: "text-[#1e2a3a]",
                                formFieldInput: "bg-[#eef2f7] border-[#d0d9e8] text-[#1e2a3a] focus:ring-[#5b7cfa] focus:border-[#5b7cfa]",
                                formButtonPrimary: "bg-[#5b7cfa] hover:bg-[#4a5fd9] text-[#eef2f7]",
                                footerActionLink: "text-[#5b7cfa] hover:text-[#4a5fd9]",
                                identityPreviewEditButton: "text-[#5b7cfa]",
                                formFieldAction: "text-[#5b7cfa]",
                                alternativeMethodsBlockButton: "border-[#d0d9e8] text-[#1e2a3a] hover:bg-[#dbe4f5]/30",
                                otpCodeFieldInput: "border-[#d0d9e8] focus:border-[#5b7cfa] focus:ring-[#5b7cfa]",
                            },
                        }}
                    />
                </main>
            </div>
        </div>
    );
}
