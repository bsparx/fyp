import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Stethoscope, Loader2 } from "lucide-react"

type DashboardLoadingProps = {
    title: string
    subtitle: string
    chips?: string[]
    cardCount?: number
}

type AuthLoadingProps = {
    title: string
    description: string
}

type RedirectLoadingProps = {
    title: string
    description: string
}

export function DashboardLoading({
    title,
    subtitle,
    chips = [],
    cardCount = 3,
}: DashboardLoadingProps) {
    return (
        <div className="relative flex flex-1 flex-col gap-6 overflow-hidden p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-linear-to-b from-[#c4a882]/10 via-[#c4a882]/5 to-transparent" />

            <div className="relative space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1 bg-[#f0e6c8]/60 text-[#8b7355] border-none">
                        Loading
                    </Badge>
                    {chips.map((chip) => (
                        <Badge key={chip} variant="outline" className="rounded-full px-3 py-1 text-[#8a8279] border-[#e5e0d8]">
                            {chip}
                        </Badge>
                    ))}
                </div>

                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-[#3d3630]">{title}</h1>
                    <p className="text-sm text-[#8a8279]">{subtitle}</p>
                </div>

                <Progress value={62} className="h-1.5 max-w-xl bg-[#e8e4e0]" />
            </div>

            <div className="relative grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: cardCount }, (_, index) => (
                    <Card
                        key={index}
                        className="border-[#e5e0d8]/80 bg-[#fdfcf9]/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-[#fdfcf9]/80"
                    >
                        <CardHeader className="space-y-3">
                            <Skeleton className="h-4 w-2/5 rounded-full bg-[#e8e4e0]" />
                            <Skeleton className="h-8 w-4/5 bg-[#e8e4e0]" />
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Skeleton className="h-3 w-full bg-[#e8e4e0]" />
                            <Skeleton className="h-3 w-5/6 bg-[#e8e4e0]" />
                            <Skeleton className="h-3 w-2/3 bg-[#e8e4e0]" />
                            <div className="pt-2">
                                <Skeleton className="h-8 w-28 rounded-md bg-[#e8e4e0]" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

export function MarketingLoading() {
    return (
        <div className="relative flex min-h-[calc(100vh-64px)] flex-col overflow-hidden">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-12 top-8 h-56 w-56 rounded-full bg-[#c4a882]/10 blur-3xl" />
                <div className="absolute -right-12 top-20 h-56 w-56 rounded-full bg-[#7a9eaf]/10 blur-3xl" />
            </div>

            <section className="relative flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
                <div className="flex items-center justify-center rounded-full bg-[#f0e6c8]/40 p-4 mb-6">
                    <Stethoscope className="h-12 w-12 text-[#8b7355] animate-pulse" />
                </div>
                <Badge variant="secondary" className="rounded-full px-3 py-1 bg-[#f0e6c8]/60 text-[#8b7355] border-none">
                    Preparing Experience
                </Badge>
                <div className="mt-6 space-y-3">
                    <Skeleton className="mx-auto h-10 w-[min(92vw,36rem)] bg-[#e8e4e0]" />
                    <Skeleton className="mx-auto h-5 w-[min(92vw,28rem)] bg-[#e8e4e0]" />
                    <Skeleton className="mx-auto h-5 w-[min(88vw,24rem)] bg-[#e8e4e0]" />
                </div>
                <div className="mt-10 flex flex-wrap justify-center gap-3">
                    <Skeleton className="h-11 w-36 rounded-full bg-[#e8e4e0]" />
                    <Skeleton className="h-11 w-40 rounded-full bg-[#e8e4e0]" />
                </div>
            </section>

            <section className="relative border-t border-[#e5e0d8] bg-[#faf6f1]/40 px-6 py-16">
                <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }, (_, index) => (
                        <Card key={index} className="bg-[#fdfcf9]/95 border-[#e5e0d8]">
                            <CardHeader className="space-y-3">
                                <Skeleton className="h-10 w-10 rounded-lg bg-[#e8e4e0]" />
                                <Skeleton className="h-5 w-2/3 bg-[#e8e4e0]" />
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Skeleton className="h-3 w-full bg-[#e8e4e0]" />
                                <Skeleton className="h-3 w-5/6 bg-[#e8e4e0]" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    )
}

export function AuthLoading({ title, description }: AuthLoadingProps) {
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#faf6f1] px-4 py-10">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-[#c4a882]/10 blur-3xl" />
            </div>

            <Card className="relative w-full max-w-md border-[#e5e0d8]/80 bg-[#fdfcf9]/95 shadow-xl backdrop-blur supports-backdrop-filter:bg-[#fdfcf9]/85">
                <CardHeader className="space-y-3">
                    <Badge variant="secondary" className="w-fit rounded-full px-3 py-1 bg-[#f0e6c8]/60 text-[#8b7355] border-none">
                        Secure Access
                    </Badge>
                    <CardTitle className="text-xl text-[#3d3630]">{title}</CardTitle>
                    <CardDescription className="text-[#8a8279]">{description}</CardDescription>
                    <Progress value={48} className="h-1.5 bg-[#e8e4e0]" />
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-10 w-full rounded-lg bg-[#e8e4e0]" />
                    <Skeleton className="h-10 w-full rounded-lg bg-[#e8e4e0]" />
                    <Skeleton className="h-10 w-2/3 rounded-lg bg-[#e8e4e0]" />
                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <Skeleton className="h-9 w-full rounded-md bg-[#e8e4e0]" />
                        <Skeleton className="h-9 w-full rounded-md bg-[#e8e4e0]" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export function RedirectLoading({ title, description }: RedirectLoadingProps) {
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#faf6f1] px-4 py-10">
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-[#c4a882]/10 via-[#faf6f1] to-[#faf6f1]" />

            <Card className="relative w-full max-w-lg border-[#e5e0d8]/80 bg-[#fdfcf9]/95 shadow-lg">
                <CardHeader className="space-y-3">
                    <Badge variant="secondary" className="w-fit rounded-full px-3 py-1 bg-[#f0e6c8]/60 text-[#8b7355] border-none">
                        Initializing
                    </Badge>
                    <CardTitle className="text-[#3d3630]">{title}</CardTitle>
                    <CardDescription className="text-[#8a8279]">{description}</CardDescription>
                    <Progress value={72} className="h-1.5 bg-[#e8e4e0]" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Skeleton className="h-16 rounded-lg bg-[#e8e4e0]" />
                        <Skeleton className="h-16 rounded-lg bg-[#e8e4e0]" />
                    </div>
                    <Skeleton className="h-9 w-40 rounded-md bg-[#e8e4e0]" />
                </CardContent>
            </Card>
        </div>
    )
}
