"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Stethoscope,
    Heart,
    Activity,
    ShieldCheck,
    Zap,
    Database,
    Brain,
    Sparkles,
    Loader2,
    HeartPulse,
} from "lucide-react"

// ─── Spinning Medical Logo ───────────────────────────────────

function LoadingLogo({ size = 48 }: { size?: number }) {
    return (
        <div className="relative" style={{ width: size, height: size }}>
            {/* Outer spinning ring */}
            <div className="absolute inset-0 rounded-full border-2 border-[#d0d9e8] border-t-[#5b7cfa] border-r-[#8aa4f0] animate-spin" />
            {/* Inner pulsing ring */}
            <div className="absolute inset-2 rounded-full border-2 border-[#d0d9e8] border-b-[#38bdf8] border-l-[#4ade80] animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
                <HeartPulse className="text-[#5b7cfa] animate-pulse" style={{ width: size * 0.4, height: size * 0.4 }} />
            </div>
        </div>
    )
}

// ─── Animated Loading Text ───────────────────────────────────

function LoadingText({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-[#6b7d99]">{text}</span>
            <span className="flex gap-0.5">
                <span className="h-1 w-1 rounded-full bg-[#5b7cfa] animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1 w-1 rounded-full bg-[#5b7cfa] animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1 w-1 rounded-full bg-[#5b7cfa] animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
        </div>
    )
}

// ─── Shimmer Skeleton ────────────────────────────────────────

function ShimmerSkeleton({ className }: { className?: string }) {
    return (
        <div className={`relative overflow-hidden rounded-md bg-[#dce3f0] ${className}`}>
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>
    )
}

// ─── Floating Particles Background ───────────────────────────

function FloatingParticles() {
    const particles = [
        { size: 6, color: "#8aa4f0", left: "10%", top: "20%", delay: "0s", duration: "4s" },
        { size: 4, color: "#38bdf8", left: "25%", top: "60%", delay: "1s", duration: "5s" },
        { size: 8, color: "#4ade80", left: "70%", top: "15%", delay: "0.5s", duration: "6s" },
        { size: 5, color: "#8aa4f0", left: "85%", top: "45%", delay: "1.5s", duration: "4.5s" },
        { size: 3, color: "#5b7cfa", left: "50%", top: "80%", delay: "2s", duration: "5.5s" },
        { size: 7, color: "#fbbf24", left: "40%", top: "30%", delay: "0.8s", duration: "4s" },
    ]

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {particles.map((p, i) => (
                <div
                    key={i}
                    className="absolute rounded-full opacity-20 animate-float"
                    style={{
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        left: p.left,
                        top: p.top,
                        animationDelay: p.delay,
                        animationDuration: p.duration,
                    }}
                />
            ))}
        </div>
    )
}

// ─── Dashboard Loading ───────────────────────────────────────

type DashboardLoadingProps = {
    title: string
    subtitle: string
    chips?: string[]
    cardCount?: number
}

export function DashboardLoading({
    title,
    subtitle,
    chips = [],
    cardCount = 3,
}: DashboardLoadingProps) {
    return (
        <div className="relative flex flex-1 flex-col gap-6 overflow-hidden p-4 pt-0 sm:p-6 sm:pt-0 bg-[#eef2f7]">
            <FloatingParticles />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-linear-to-b from-[#8aa4f0]/10 via-[#8aa4f0]/5 to-transparent" />

            <div className="relative space-y-5">
                {/* Top bar with logo */}
                <div className="flex items-center gap-4">
                    <LoadingLogo size={40} />
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="rounded-full px-3 py-1 bg-[#dbe4f5]/60 text-[#5b7cfa] border-none">
                            <Sparkles className="size-3 mr-1" />
                            Loading
                        </Badge>
                        {chips.map((chip) => (
                            <Badge key={chip} variant="outline" className="rounded-full px-3 py-1 text-[#6b7d99] border-[#d0d9e8]">
                                {chip}
                            </Badge>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight text-[#1e2a3a]">{title}</h1>
                    <p className="text-sm text-[#6b7d99]">{subtitle}</p>
                </div>

                {/* Animated progress bar */}
                <div className="max-w-xl space-y-2">
                    <div className="flex items-center justify-between">
                        <LoadingText text="Initializing" />
                        <span className="text-xs text-[#6b7d99] tabular-nums animate-pulse">62%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#dce3f0]">
                        <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-[#5b7cfa] via-[#8aa4f0] to-[#5b7cfa] animate-[loading-bar_2s_ease-in-out_infinite]" />
                    </div>
                </div>
            </div>

            {/* Skeleton cards */}
            <div className="relative grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: cardCount }, (_, index) => (
                    <Card
                        key={index}
                        className="border-[#d0d9e8]/80 bg-[#ffffff]/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-[#ffffff]/80"
                    >
                        <CardHeader className="space-y-3">
                            <div className="flex items-center justify-between">
                                <ShimmerSkeleton className="h-4 w-2/5" />
                                <div className="flex gap-1">
                                    <div className="h-2 w-2 rounded-full bg-[#dce3f0] animate-pulse" />
                                    <div className="h-2 w-2 rounded-full bg-[#dce3f0] animate-pulse" style={{ animationDelay: "0.2s" }} />
                                    <div className="h-2 w-2 rounded-full bg-[#dce3f0] animate-pulse" style={{ animationDelay: "0.4s" }} />
                                </div>
                            </div>
                            <ShimmerSkeleton className="h-8 w-4/5" />
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <ShimmerSkeleton className="h-3 w-full" />
                            <ShimmerSkeleton className="h-3 w-5/6" />
                            <ShimmerSkeleton className="h-3 w-2/3" />
                            <div className="flex items-center gap-2 pt-2">
                                <ShimmerSkeleton className="h-8 w-28 rounded-md" />
                                <div className="ml-auto flex items-center gap-1.5">
                                    <Loader2 className="h-3 w-3 animate-spin text-[#6b7d99]" />
                                    <span className="text-[10px] text-[#6b7d99]">Loading data</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Bottom activity indicators */}
            <div className="relative mt-auto flex flex-wrap items-center gap-4 border-t border-[#d0d9e8] pt-4">
                {[
                    { icon: Database, label: "Database" },
                    { icon: Brain, label: "AI Models" },
                    { icon: ShieldCheck, label: "Security" },
                    { icon: Activity, label: "Analytics" },
                ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2 text-xs text-[#6b7d99]">
                        <Icon className="size-3.5 text-[#5b7cfa]" />
                        <span>{label}</span>
                        <div className="h-1.5 w-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Marketing Loading ───────────────────────────────────────

export function MarketingLoading() {
    return (
        <div className="relative flex min-h-[calc(100vh-64px)] flex-col overflow-hidden bg-[#eef2f7]">
            <FloatingParticles />
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-12 top-8 h-56 w-56 rounded-full bg-[#8aa4f0]/10 blur-3xl animate-pulse" />
                <div className="absolute -right-12 top-20 h-56 w-56 rounded-full bg-[#38bdf8]/10 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
                <div className="absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-[#4ade80]/10 blur-3xl animate-pulse" style={{ animationDelay: "0.5s" }} />
            </div>

            <section className="relative flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
                <div className="mb-8">
                    <LoadingLogo size={64} />
                </div>

                <Badge variant="secondary" className="rounded-full px-4 py-1.5 bg-[#dbe4f5]/60 text-[#5b7cfa] border-none text-sm">
                    <Sparkles className="size-3.5 mr-1.5" />
                    Preparing Experience
                </Badge>

                <div className="mt-8 space-y-3 w-full max-w-xl">
                    <ShimmerSkeleton className="mx-auto h-10 w-[min(92vw,36rem)]" />
                    <ShimmerSkeleton className="mx-auto h-5 w-[min(92vw,28rem)]" />
                    <ShimmerSkeleton className="mx-auto h-5 w-[min(88vw,24rem)]" />
                </div>

                <div className="mt-10 flex flex-wrap justify-center gap-3">
                    <ShimmerSkeleton className="h-11 w-36 rounded-full" />
                    <ShimmerSkeleton className="h-11 w-40 rounded-full" />
                </div>

                <div className="mt-12 flex items-center gap-6">
                    {[
                        { icon: Heart, label: "Healthcare" },
                        { icon: Brain, label: "AI Powered" },
                        { icon: ShieldCheck, label: "Secure" },
                    ].map(({ icon: Icon, label }) => (
                        <div key={label} className="flex items-center gap-2 text-xs text-[#6b7d99]">
                            <Icon className="size-4 text-[#5b7cfa]" />
                            <span>{label}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="relative border-t border-[#d0d9e8] bg-[#eef2f7]/40 px-6 py-16">
                <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }, (_, index) => (
                        <Card key={index} className="bg-[#ffffff]/95 border-[#d0d9e8]">
                            <CardHeader className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <ShimmerSkeleton className="h-10 w-10 rounded-lg" />
                                    <Loader2 className="size-4 animate-spin text-[#6b7d99]" />
                                </div>
                                <ShimmerSkeleton className="h-5 w-2/3" />
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <ShimmerSkeleton className="h-3 w-full" />
                                <ShimmerSkeleton className="h-3 w-5/6" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    )
}

// ─── Auth Loading ────────────────────────────────────────────

type AuthLoadingProps = {
    title: string
    description: string
}

export function AuthLoading({ title, description }: AuthLoadingProps) {
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#eef2f7] px-4 py-10">
            <FloatingParticles />
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-[#8aa4f0]/10 blur-3xl animate-pulse" />
                <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-[#38bdf8]/10 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
            </div>

            <Card className="relative w-full max-w-md border-[#d0d9e8]/80 bg-[#ffffff]/95 shadow-xl backdrop-blur supports-backdrop-filter:bg-[#ffffff]/85">
                <CardHeader className="space-y-4 pb-6">
                    <div className="flex items-center justify-center py-2">
                        <LoadingLogo size={48} />
                    </div>
                    <div className="text-center space-y-1">
                        <Badge variant="secondary" className="rounded-full px-3 py-1 bg-[#dbe4f5]/60 text-[#5b7cfa] border-none">
                            <ShieldCheck className="size-3 mr-1" />
                            Secure Access
                        </Badge>
                    </div>
                    <CardTitle className="text-xl text-[#1e2a3a] text-center">{title}</CardTitle>
                    <CardDescription className="text-[#6b7d99] text-center">{description}</CardDescription>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <LoadingText text="Connecting" />
                            <span className="text-xs text-[#6b7d99] tabular-nums animate-pulse">48%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#dce3f0]">
                            <div className="h-full w-[48%] rounded-full bg-gradient-to-r from-[#5b7cfa] via-[#8aa4f0] to-[#5b7cfa] animate-[loading-bar_2s_ease-in-out_infinite]" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <ShimmerSkeleton className="h-10 w-full rounded-lg" />
                    <ShimmerSkeleton className="h-10 w-full rounded-lg" />
                    <ShimmerSkeleton className="h-10 w-2/3 rounded-lg" />
                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <ShimmerSkeleton className="h-9 w-full rounded-md" />
                        <ShimmerSkeleton className="h-9 w-full rounded-md" />
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-3 text-xs text-[#6b7d99]">
                        <Zap className="size-3 text-[#8aa4f0]" />
                        <span>Encrypted connection</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

// ─── Redirect Loading ────────────────────────────────────────

type RedirectLoadingProps = {
    title: string
    description: string
}

export function RedirectLoading({ title, description }: RedirectLoadingProps) {
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#eef2f7] px-4 py-10">
            <FloatingParticles />
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-[#8aa4f0]/10 via-[#eef2f7] to-[#eef2f7]" />

            <Card className="relative w-full max-w-lg border-[#d0d9e8]/80 bg-[#ffffff]/95 shadow-lg">
                <CardHeader className="space-y-4 pb-6">
                    <div className="flex items-center justify-center py-2">
                        <LoadingLogo size={48} />
                    </div>
                    <div className="text-center">
                        <Badge variant="secondary" className="rounded-full px-3 py-1 bg-[#dbe4f5]/60 text-[#5b7cfa] border-none">
                            <Sparkles className="size-3 mr-1" />
                            Initializing
                        </Badge>
                    </div>
                    <CardTitle className="text-[#1e2a3a] text-center">{title}</CardTitle>
                    <CardDescription className="text-[#6b7d99] text-center">{description}</CardDescription>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <LoadingText text="Redirecting" />
                            <span className="text-xs text-[#6b7d99] tabular-nums animate-pulse">72%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#dce3f0]">
                            <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#5b7cfa] via-[#8aa4f0] to-[#5b7cfa] animate-[loading-bar_2s_ease-in-out_infinite]" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-[#d0d9e8] bg-[#eef2f7]">
                            <div className="rounded-full p-2 bg-[#dbe4f5]/40">
                                <Database className="size-4 text-[#5b7cfa]" />
                            </div>
                            <div className="space-y-1.5 flex-1">
                                <ShimmerSkeleton className="h-3 w-20" />
                                <ShimmerSkeleton className="h-2 w-full" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-[#d0d9e8] bg-[#eef2f7]">
                            <div className="rounded-full p-2 bg-[#dbe4f5]/40">
                                <Brain className="size-4 text-[#38bdf8]" />
                            </div>
                            <div className="space-y-1.5 flex-1">
                                <ShimmerSkeleton className="h-3 w-20" />
                                <ShimmerSkeleton className="h-2 w-full" />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-2">
                        <Loader2 className="size-4 animate-spin text-[#5b7cfa]" />
                        <span className="text-sm text-[#6b7d99]">Please wait while we prepare your workspace</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
