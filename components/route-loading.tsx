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
            <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-linear-to-b from-primary/10 via-primary/5 to-transparent" />

            <div className="relative space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                        Loading
                    </Badge>
                    {chips.map((chip) => (
                        <Badge key={chip} variant="outline" className="rounded-full px-3 py-1">
                            {chip}
                        </Badge>
                    ))}
                </div>

                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                </div>

                <Progress value={62} className="h-1.5 max-w-xl" />
            </div>

            <div className="relative grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: cardCount }, (_, index) => (
                    <Card
                        key={index}
                        className="border-border/60 bg-card/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-card/80"
                    >
                        <CardHeader className="space-y-3">
                            <Skeleton className="h-4 w-2/5 rounded-full" />
                            <Skeleton className="h-8 w-4/5" />
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-5/6" />
                            <Skeleton className="h-3 w-2/3" />
                            <div className="pt-2">
                                <Skeleton className="h-8 w-28 rounded-md" />
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
                <div className="absolute -left-12 top-8 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute -right-12 top-20 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
            </div>

            <section className="relative flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                    Preparing Experience
                </Badge>
                <div className="mt-6 space-y-3">
                    <Skeleton className="mx-auto h-10 w-[min(92vw,36rem)]" />
                    <Skeleton className="mx-auto h-5 w-[min(92vw,28rem)]" />
                    <Skeleton className="mx-auto h-5 w-[min(88vw,24rem)]" />
                </div>
                <div className="mt-10 flex flex-wrap justify-center gap-3">
                    <Skeleton className="h-11 w-36 rounded-full" />
                    <Skeleton className="h-11 w-40 rounded-full" />
                </div>
            </section>

            <section className="relative border-t bg-muted/40 px-6 py-16">
                <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }, (_, index) => (
                        <Card key={index} className="bg-card/95">
                            <CardHeader className="space-y-3">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <Skeleton className="h-5 w-2/3" />
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-5/6" />
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
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
            </div>

            <Card className="relative w-full max-w-md border-border/60 bg-card/95 shadow-xl backdrop-blur supports-backdrop-filter:bg-card/85">
                <CardHeader className="space-y-3">
                    <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
                        Secure Access
                    </Badge>
                    <CardTitle className="text-xl">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                    <Progress value={48} className="h-1.5" />
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-2/3 rounded-lg" />
                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <Skeleton className="h-9 w-full rounded-md" />
                        <Skeleton className="h-9 w-full rounded-md" />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export function RedirectLoading({ title, description }: RedirectLoadingProps) {
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-primary/10 via-background to-background" />

            <Card className="relative w-full max-w-lg border-border/60 bg-card/95 shadow-lg">
                <CardHeader className="space-y-3">
                    <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
                        Initializing
                    </Badge>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                    <Progress value={72} className="h-1.5" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Skeleton className="h-16 rounded-lg" />
                        <Skeleton className="h-16 rounded-lg" />
                    </div>
                    <Skeleton className="h-9 w-40 rounded-md" />
                </CardContent>
            </Card>
        </div>
    )
}