import {
    SignInButton,
    SignUpButton,
    SignedIn,
    SignedOut,
    UserButton,
} from '@clerk/nextjs'
import Link from 'next/link'

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <header className="flex justify-between items-center p-4 gap-4 h-16 border-b">
                <Link href="/" className="font-semibold text-lg">
                    HMS Admin
                </Link>
                <div className="flex items-center gap-4">
                    <SignedOut>
                        <SignInButton />
                        <SignUpButton>
                            <button className="bg-primary text-primary-foreground rounded-full font-medium text-sm h-10 px-4 cursor-pointer hover:bg-primary/90 transition-colors">
                                Sign Up
                            </button>
                        </SignUpButton>
                    </SignedOut>
                    <SignedIn>
                        <Link
                            href="/dashboard"
                            className="text-sm font-medium hover:underline"
                        >
                            Dashboard
                        </Link>
                        <UserButton />
                    </SignedIn>
                </div>
            </header>
            {children}
        </>
    )
}
