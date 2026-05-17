import {
    SignInButton,
    SignUpButton,
    SignedIn,
    SignedOut,
    UserButton,
} from '@clerk/nextjs'
import Link from 'next/link'
import { Stethoscope } from 'lucide-react'

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <header className="flex justify-between items-center p-4 gap-4 h-16 border-b border-[#d0d9e8] bg-[#ffffff]">
                <Link href="/" className="font-semibold text-lg text-[#1e2a3a] flex items-center gap-2">
                    <div className="flex items-center justify-center rounded-lg bg-[#5b7cfa] p-1.5">
                        <Stethoscope className="size-4 text-[#eef2f7]" />
                    </div>
                    HMS Admin
                </Link>
                <div className="flex items-center gap-4">
                    <SignedOut>
                        <SignInButton>
                            <button className="text-sm font-medium text-[#1e2a3a] hover:text-[#5b7cfa] transition-colors cursor-pointer" aria-label="Sign in to your account">
                                Sign In
                            </button>
                        </SignInButton>
                        <SignUpButton>
                            <button className="bg-[#5b7cfa] text-[#eef2f7] rounded-full font-medium text-sm h-10 px-5 cursor-pointer hover:bg-[#4a5fd9] transition-colors shadow-sm" aria-label="Create a new account">
                                Sign Up
                            </button>
                        </SignUpButton>
                    </SignedOut>
                    <SignedIn>
                        <Link
                            href="/dashboard"
                            className="text-sm font-medium text-[#1e2a3a] hover:text-[#5b7cfa] transition-colors"
                        >
                            Dashboard
                        </Link>
                        <UserButton
                            appearance={{
                                elements: {
                                    avatarBox: "w-8 h-8",
                                    userButtonPopoverCard: "bg-[#ffffff] border border-[#d0d9e8] shadow-lg",
                                    userPreviewMainIdentifier: "text-[#1e2a3a] font-medium",
                                    userPreviewSecondaryIdentifier: "text-[#6b7d99] text-xs",
                                    userButtonPopoverActionButton: "text-[#1e2a3a] hover:bg-[#dbe4f5]/40",
                                    userButtonPopoverActionButtonText: "text-[#1e2a3a]",
                                },
                            }}
                        />
                    </SignedIn>
                </div>
            </header>
            {children}
        </>
    )
}
