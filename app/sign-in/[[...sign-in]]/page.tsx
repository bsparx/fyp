import { SignIn } from "@clerk/nextjs";
import { Stethoscope } from "lucide-react";

export default function Page() {
    return (
        <div className="relative flex min-h-screen items-center justify-center bg-[#faf6f1] px-4 py-10 overflow-hidden">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-[#c4a882]/10 blur-3xl" />
                <div className="absolute -left-12 bottom-0 h-56 w-56 rounded-full bg-[#7a9eaf]/8 blur-3xl" />
                <div className="absolute -right-12 bottom-20 h-56 w-56 rounded-full bg-[#8fa68e]/8 blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center rounded-2xl bg-[#f0e6c8]/50 p-3 mb-4 border border-[#e5e0d8] mx-auto w-fit">
                        <Stethoscope className="h-8 w-8 text-[#8b7355]" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#3d3630]">Welcome back</h1>
                    <p className="mt-2 text-sm text-[#8a8279]">Sign in to access the Hospital Management System</p>
                </div>

                <div className="p-6 rounded-2xl shadow-xl bg-[#fdfcf9] border border-[#e5e0d8]">
                    <SignIn
                        appearance={{
                            elements: {
                                card: "bg-transparent shadow-none",
                                headerTitle: "hidden",
                                headerSubtitle: "hidden",
                                socialButtonsBlockButton: "border-[#e5e0d8] bg-[#faf6f1] text-[#3d3630] hover:bg-[#f0e6c8]/30",
                                formFieldLabel: "text-[#3d3630]",
                                formFieldInput: "bg-[#faf6f1] border-[#e5e0d8] text-[#3d3630] focus:ring-[#8b7355] focus:border-[#8b7355]",
                                formButtonPrimary: "bg-[#8b7355] hover:bg-[#6b5a42] text-[#faf6f1]",
                                footerActionLink: "text-[#8b7355] hover:text-[#6b5a42]",
                                identityPreviewEditButton: "text-[#8b7355]",
                                formFieldAction: "text-[#8b7355]",
                                alternativeMethodsBlockButton: "border-[#e5e0d8] text-[#3d3630] hover:bg-[#f0e6c8]/30",
                                otpCodeFieldInput: "border-[#e5e0d8] focus:border-[#8b7355] focus:ring-[#8b7355]",
                            },
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
