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
            <header className="flex justify-between items-center p-4 gap-4 h-16 border-b border-[#e5e0d8] bg-[#fdfcf9]">
                <Link href="/" className="font-semibold text-lg text-[#3d3630] flex items-center gap-2">
                    <div className="flex items-center justify-center rounded-lg bg-[#8b7355] p-1.5">
                        <Stethoscope className="size-4 text-[#faf6f1]" />
                    </div>
                    HMS Admin
                </Link>
                <div className="flex items-center gap-4">
                    <SignedOut>
                        <SignInButton>
                            <button className="text-sm font-medium text-[#3d3630] hover:text-[#8b7355] transition-colors cursor-pointer">
                                Sign In
                            </button>
                        </SignInButton>
                        <SignUpButton>
                            <button className="bg-[#8b7355] text-[#faf6f1] rounded-full font-medium text-sm h-10 px-5 cursor-pointer hover:bg-[#6b5a42] transition-colors shadow-sm">
                                Sign Up
                            </button>
                        </SignUpButton>
                    </SignedOut>
                    <SignedIn>
                        <Link
                            href="/dashboard"
                            className="text-sm font-medium text-[#3d3630] hover:text-[#8b7355] transition-colors"
                        >
                            Dashboard
                        </Link>
                        <UserButton
                            appearance={{
                                elements: {
                                    avatarBox: "w-8 h-8",
                                    userButtonPopoverCard: "bg-[#fdfcf9] border border-[#e5e0d8] shadow-lg",
                                    userPreviewMainIdentifier: "text-[#3d3630] font-medium",
                                    userPreviewSecondaryIdentifier: "text-[#8a8279] text-xs",
                                    userButtonPopoverActionButton: "text-[#3d3630] hover:bg-[#f0e6c8]/40",
                                    userButtonPopoverActionButtonText: "text-[#3d3630]",
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
