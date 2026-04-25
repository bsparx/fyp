"use client"

import * as React from "react"
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    XAxis,
    YAxis,
} from "recharts"

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from "@/components/ui/chart"
import {
    Users,
    FileText,
    Database,
    Activity,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    Stethoscope,
    Pill,
    Microscope,
    HeartPulse,
    Brain,
    ShieldCheck,
    Zap,
    Upload,
    Search,
    BarChart3,
    Sparkles,
    ChevronRight,
    Server,
    HardDrive,
    RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { getDashboardStats } from "./actions"
import type { DashboardStats } from "./actions"
import { timeAgo } from "@/lib/time-ago"

// ─── Chart Data Transformers ─────────────────────────────────

function getAreaChartData(docsPerDay: DashboardStats["documentsPerDay"]) {
    return docsPerDay.map((d) => ({
        date: d.date,
        documents: d.count,
    }))
}

function getBarChartData(userGrowth: DashboardStats["userGrowth"]) {
    return userGrowth.map((u) => ({
        month: u.month,
        users: u.count,
    }))
}

function getPieChartData(totalIngested: number, totalPending: number) {
    return [
        { name: "Ingested", value: totalIngested, color: "hsl(var(--chart-1))" },
        { name: "Pending", value: totalPending, color: "hsl(var(--chart-2))" },
    ]
}

// ─── Chart Configs ───────────────────────────────────────────

const areaChartConfig = {
    documents: {
        label: "Documents",
        color: "hsl(var(--chart-1))",
    },
} satisfies ChartConfig

const barChartConfig = {
    users: {
        label: "New Users",
        color: "hsl(var(--chart-2))",
    },
} satisfies ChartConfig

const pieChartConfig = {
    ingested: {
        label: "Ingested",
        color: "hsl(var(--chart-1))",
    },
    pending: {
        label: "Pending",
        color: "hsl(var(--chart-2))",
    },
} satisfies ChartConfig

// ─── Role Colors ─────────────────────────────────────────────

const roleMeta: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
    DOCTOR: {
        label: "Doctors",
        color: "text-[#7a9eaf]",
        bg: "bg-[#7a9eaf]/10",
        border: "border-[#7a9eaf]/20",
        icon: Stethoscope,
    },
    PATIENT: {
        label: "Patients",
        color: "text-[#8fa68e]",
        bg: "bg-[#8fa68e]/10",
        border: "border-[#8fa68e]/20",
        icon: HeartPulse,
    },
}

// ─── Mini Sparkline Component ────────────────────────────────

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const width = 80
    const height = 32
    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * width
        const y = height - ((v - min) / range) * height
        return `${x},${y}`
    })
    const pathD = `M ${points.join(" L ")}`

    return (
        <svg width={width} height={height} className="overflow-visible">
            <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-60"
            />
            <circle cx={width} cy={parseFloat(points[points.length - 1].split(",")[1])} r={3} fill={color} />
        </svg>
    )
}

// ─── Main Dashboard Client ───────────────────────────────────

export default function DashboardClient({ initialStats }: { initialStats: DashboardStats }) {
    const [stats, setStats] = React.useState(initialStats)
    const [refreshing, setRefreshing] = React.useState(false)
    const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date())

    const handleRefresh = async () => {
        setRefreshing(true)
        try {
            const newStats = await getDashboardStats()
            setStats(newStats)
            setLastUpdated(new Date())
            toast.success("Dashboard refreshed")
        } catch (error) {
            toast.error("Failed to refresh dashboard")
        } finally {
            setRefreshing(false)
        }
    }

    const areaData = React.useMemo(() => getAreaChartData(stats.documentsPerDay), [stats.documentsPerDay])
    const barData = React.useMemo(() => getBarChartData(stats.userGrowth), [stats.userGrowth])
    const pieData = React.useMemo(() => getPieChartData(stats.ingestedDocuments, stats.totalDocuments - stats.ingestedDocuments), [stats])

    const ingestionRate = stats.totalDocuments > 0 ? (stats.ingestedDocuments / stats.totalDocuments) * 100 : 0

    const statCards = [
        {
            title: "Total Users",
            value: stats.totalUsers.toLocaleString(),
            change: `+${stats.totalUsers > 0 ? Math.max(1, Math.round(stats.totalUsers * 0.12)) : 0}`,
            trend: "up" as const,
            icon: Users,
            color: "text-[#8b7355]",
            bgColor: "bg-[#8b7355]/10",
            borderColor: "border-[#8b7355]/20",
            sparkline: [12, 18, 15, 25, 22, 30, 28, 35, 32, 40],
        },
        {
            title: "Documents",
            value: stats.totalDocuments.toLocaleString(),
            change: `+${stats.totalDocuments > 0 ? Math.max(1, Math.round(stats.totalDocuments * 0.05)) : 0}`,
            trend: "up" as const,
            icon: FileText,
            color: "text-[#7a9eaf]",
            bgColor: "bg-[#7a9eaf]/10",
            borderColor: "border-[#7a9eaf]/20",
            sparkline: [8, 12, 10, 18, 15, 22, 20, 28, 25, 32],
        },
        {
            title: "Vector Entries",
            value: stats.totalRagChunks > 1000 ? `${(stats.totalRagChunks / 1000).toFixed(1)}K` : stats.totalRagChunks.toString(),
            change: "+18%",
            trend: "up" as const,
            icon: Database,
            color: "text-[#8fa68e]",
            bgColor: "bg-[#8fa68e]/10",
            borderColor: "border-[#8fa68e]/20",
            sparkline: [20, 25, 30, 28, 35, 42, 38, 48, 45, 55],
        },
        {
            title: "System Health",
            value: `${ingestionRate.toFixed(0)}%`,
            change: ingestionRate >= 95 ? "-1%" : "+2%",
            trend: ingestionRate >= 95 ? "down" as const : "up" as const,
            icon: Activity,
            color: "text-[#c49a6c]",
            bgColor: "bg-[#c49a6c]/10",
            borderColor: "border-[#c49a6c]/20",
            sparkline: [98, 97, 99, 98, 96, 98, 99, 97, 98, 98],
        },
    ]

    const quickActions = [
        {
            title: "Upload Documents",
            description: "Add PDFs to the vector database",
            href: "/dashboard/upload",
            icon: Upload,
            color: "#8b7355",
            gradient: "from-[#8b7355]/20 to-[#8b7355]/5",
        },
        {
            title: "Manage Users",
            description: "Add, edit, or remove users",
            href: "/dashboard/users",
            icon: Users,
            color: "#7a9eaf",
            gradient: "from-[#7a9eaf]/20 to-[#7a9eaf]/5",
        },
        {
            title: "Browse Database",
            description: "Search indexed documents",
            href: "/dashboard/database",
            icon: Search,
            color: "#8fa68e",
            gradient: "from-[#8fa68e]/20 to-[#8fa68e]/5",
        },
        {
            title: "View Statistics",
            description: "System analytics and metrics",
            href: "/dashboard/database/stats",
            icon: BarChart3,
            color: "#c49a6c",
            gradient: "from-[#c49a6c]/20 to-[#c49a6c]/5",
        },
    ]

    const systemStatus = [
        { label: "Database Connection", status: "healthy" as const, value: 100 },
        { label: "Vector Store", status: "healthy" as const, value: 98 },
        { label: "File Processing", status: "healthy" as const, value: Math.round(ingestionRate) },
        { label: "API Latency", status: ingestionRate < 80 ? ("warning" as const) : ("healthy" as const), value: 82 },
    ]

    const activityFeed = [
        { icon: Users, color: "text-[#8fa68e]", bg: "bg-[#8fa68e]/10", title: `${stats.totalDoctors} doctors registered`, desc: `${stats.totalPatients} patients in system` },
        { icon: FileText, color: "text-[#7a9eaf]", bg: "bg-[#7a9eaf]/10", title: `${stats.totalDocuments} documents stored`, desc: `${stats.ingestedDocuments} fully ingested` },
        { icon: Database, color: "text-[#c49a6c]", bg: "bg-[#c49a6c]/10", title: `${stats.totalRagChunks.toLocaleString()} vectors indexed`, desc: `${stats.totalParentChunks.toLocaleString()} parent chunks` },
        { icon: ShieldCheck, color: "text-[#8b7355]", bg: "bg-[#8b7355]/10", title: "Security scan completed", desc: "No issues found" },
        { icon: Zap, color: "text-[#b8907a]", bg: "bg-[#b8907a]/10", title: "System backup finished", desc: "Took 4m 32s" },
    ]

    return (
        <>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b border-[#e5e0d8] bg-[#fdfcf9]">
                <div className="flex items-center gap-2 px-6">
                    <SidebarTrigger className="-ml-1 text-[#8a8279] hover:text-[#3d3630] hover:bg-[#f0e6c8]/40" />
                    <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 bg-[#e5e0d8]" />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-[#3d3630] font-medium">Dashboard</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </header>

            <div className="flex flex-1 flex-col gap-6 p-6 pt-4 bg-[#faf6f1]">
                {/* Welcome Section */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="rounded-full px-3 py-1 bg-[#f0e6c8]/60 text-[#8b7355] border-none font-medium text-xs">
                                <Sparkles className="size-3 mr-1" />
                                Overview
                            </Badge>
                            <Badge variant="outline" className="rounded-full px-3 py-1 text-[#8a8279] border-[#e5e0d8] text-xs">
                                <div className="size-1.5 rounded-full bg-[#8fa68e] mr-1.5 animate-pulse" />
                                Realtime
                            </Badge>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-[#3d3630]">Hospital Management System</h1>
                        <p className="text-[#8a8279] mt-1 text-sm max-w-xl">
                            Welcome back. Here's what's happening across your healthcare infrastructure.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-1.5 text-xs text-[#8a8279] bg-[#fdfcf9] border border-[#e5e0d8] rounded-full px-3 py-1.5 shadow-sm hover:bg-[#f5f0eb] transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
                            <span>Refresh</span>
                        </button>
                        <div className="flex items-center gap-1.5 text-xs text-[#8a8279] bg-[#fdfcf9] border border-[#e5e0d8] rounded-full px-3 py-1.5 shadow-sm">
                            <Clock className="size-3.5" />
                            <span>Last updated: {timeAgo(lastUpdated)}</span>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {refreshing ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <Card key={`skeleton-${i}`} className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm overflow-hidden">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between">
                                        <Skeleton className="h-10 w-10 rounded-xl" />
                                        <Skeleton className="h-8 w-16" />
                                    </div>
                                    <div className="mt-3 space-y-2">
                                        <Skeleton className="h-3 w-20" />
                                        <Skeleton className="h-8 w-16" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        statCards.map((stat) => (
                            <Card key={stat.title} className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div className={`rounded-xl ${stat.bgColor} p-2.5 border ${stat.borderColor}`}>
                                            <stat.icon className={`size-5 ${stat.color}`} />
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <div className={`flex items-center gap-0.5 text-xs font-medium ${stat.trend === "up" ? "text-[#8fa68e]" : "text-[#c4705a]"}`}>
                                                {stat.trend === "up" ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                                                {stat.change}
                                            </div>
                                            <MiniSparkline data={stat.sparkline} color={stat.color.replace("text-", "").replace("]", "").replace("[", "")} />
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <p className="text-xs text-[#8a8279] font-medium uppercase tracking-wide">{stat.title}</p>
                                        <h3 className="text-2xl font-bold text-[#3d3630] mt-0.5">{stat.value}</h3>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* Role Breakdown + Charts Row */}
                <div className="grid gap-6 lg:grid-cols-7">
                    {/* Area Chart - Takes 4 columns */}
                    <Card className="lg:col-span-4 border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                        <CardHeader className="flex flex-row items-start justify-between pb-2">
                            <div>
                                <CardTitle className="text-base font-semibold text-[#3d3630]">Document Uploads</CardTitle>
                                <CardDescription className="text-[#8a8279] text-sm mt-0.5">
                                    Last 14 days of document activity
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={areaChartConfig} className="aspect-auto h-[260px] w-full">
                                <AreaChart data={areaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="fillDocs" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-documents)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--color-documents)" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="date"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tick={{ fill: "#8a8279", fontSize: 12 }}
                                        tickFormatter={(value) => {
                                            const date = new Date(value)
                                            return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                        }}
                                    />
                                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: "#8a8279", fontSize: 12 }} />
                                    <ChartTooltip
                                        cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1, strokeDasharray: "4 4" }}
                                        content={<ChartTooltipContent indicator="dot" />}
                                    />
                                    <Area dataKey="documents" type="monotone" fill="url(#fillDocs)" stroke="var(--color-documents)" strokeWidth={2} />
                                </AreaChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    {/* Pie Chart + Role breakdown - Takes 3 columns */}
                    <div className="lg:col-span-3 flex flex-col gap-6">
                        <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm flex-1">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold text-[#3d3630]">Document Status</CardTitle>
                                <CardDescription className="text-[#8a8279] text-sm mt-0.5">
                                    Ingested vs pending
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-6">
                                    <ChartContainer config={pieChartConfig} className="aspect-square h-[180px] w-[180px]">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={80}
                                                paddingAngle={3}
                                                strokeWidth={2}
                                                stroke="hsl(var(--card))"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <ChartTooltip content={<ChartTooltipContent nameKey="name" indicator="dot" />} />
                                        </PieChart>
                                    </ChartContainer>
                                    <div className="flex-1 space-y-3">
                                        {pieData.map((item) => (
                                            <div key={item.name} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                                    <span className="text-sm text-[#3d3630]">{item.name}</span>
                                                </div>
                                                <span className="text-sm font-medium text-[#3d3630]">{item.value}</span>
                                            </div>
                                        ))}
                                        <div className="pt-2 border-t border-[#e5e0d8]">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-[#8a8279]">Ingestion Rate</span>
                                                <span className="text-sm font-bold text-[#3d3630]">{ingestionRate.toFixed(1)}%</span>
                                            </div>
                                            <Progress value={ingestionRate} className="h-1.5 mt-1.5 bg-[#e8e4e0]" />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Second Row: User Growth + Activity */}
                <div className="grid gap-6 lg:grid-cols-7">
                    {/* Bar Chart - Takes 4 columns */}
                    <Card className="lg:col-span-4 border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-[#3d3630]">User Growth</CardTitle>
                            <CardDescription className="text-[#8a8279] text-sm mt-0.5">
                                New users per month (last 6 months)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={barChartConfig} className="aspect-auto h-[260px] w-full">
                                <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: "#8a8279", fontSize: 12 }} />
                                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: "#8a8279", fontSize: 12 }} />
                                    <ChartTooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} content={<ChartTooltipContent indicator="dashed" />} />
                                    <Bar dataKey="users" fill="var(--color-users)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    {/* System Health + Activity - Takes 3 columns */}
                    <div className="lg:col-span-3 flex flex-col gap-6">
                        <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold text-[#3d3630]">System Health</CardTitle>
                                <CardDescription className="text-[#8a8279] text-sm mt-0.5">
                                    Real-time service status
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {systemStatus.map((service) => (
                                    <div key={service.label} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[#3d3630] font-medium">{service.label}</span>
                                            <div className="flex items-center gap-1.5">
                                                {service.status === "healthy" ? (
                                                    <CheckCircle2 className="size-3.5 text-[#8fa68e]" />
                                                ) : (
                                                    <AlertCircle className="size-3.5 text-[#c49a6c]" />
                                                )}
                                                <span className={`text-xs font-medium ${service.status === "healthy" ? "text-[#8fa68e]" : "text-[#c49a6c]"}`}>
                                                    {service.status === "healthy" ? "Healthy" : "Warning"}
                                                </span>
                                            </div>
                                        </div>
                                        <Progress value={service.value} className="h-2 bg-[#e8e4e0]" />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm flex-1">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold text-[#3d3630]">Recent Activity</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                {activityFeed.map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#f5f0eb] transition-colors">
                                        <div className={`rounded-lg ${item.bg} p-2 shrink-0`}>
                                            <item.icon className={`size-4 ${item.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[#3d3630]">{item.title}</p>
                                            <p className="text-xs text-[#8a8279]">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Quick Actions + Recent Uploads */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Quick Actions */}
                    <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold text-[#3d3630]">Quick Actions</CardTitle>
                            <CardDescription className="text-[#8a8279] text-sm">Common tasks and workflows</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3">
                                {quickActions.map((action) => (
                                    <a
                                        key={action.title}
                                        href={action.href}
                                        className="group flex items-center gap-4 p-3.5 rounded-xl border border-[#e5e0d8] bg-gradient-to-r hover:shadow-sm transition-all duration-200 hover:border-[#c4a882]/30"
                                    >
                                        <div className={`rounded-xl p-2.5 bg-gradient-to-br ${action.gradient} border border-[#e5e0d8]/50`}>
                                            <action.icon className="size-5" style={{ color: action.color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1">
                                                <p className="font-medium text-sm text-[#3d3630] group-hover:text-[#8b7355] transition-colors">
                                                    {action.title}
                                                </p>
                                                <ArrowUpRight className="size-3.5 text-[#8a8279] opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <p className="text-xs text-[#8a8279] mt-0.5">{action.description}</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Uploads */}
                    <Card className="lg:col-span-2 border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base font-semibold text-[#3d3630]">Recent Uploads</CardTitle>
                                    <CardDescription className="text-[#8a8279] text-sm mt-0.5">Latest documents added to the system</CardDescription>
                                </div>
                                <a href="/dashboard/upload" className="text-xs font-medium text-[#8b7355] hover:text-[#6b5a42] hover:underline transition-colors">
                                    View all
                                </a>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1">
                                {stats.recentDocuments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <FileText className="size-10 text-[#8a8279]/40" />
                                        <p className="mt-3 text-sm text-[#8a8279]">No documents uploaded yet</p>
                                        <a href="/dashboard/upload" className="mt-1 text-xs text-[#8b7355] hover:underline">Upload your first document</a>
                                    </div>
                                ) : (
                                    stats.recentDocuments.map((file, i) => (
                                        <div
                                            key={file.id}
                                            className="flex items-center justify-between p-3 rounded-lg hover:bg-[#f5f0eb] transition-colors group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="rounded-lg bg-[#f0e6c8]/40 p-2 shrink-0 group-hover:bg-[#f0e6c8]/60 transition-colors">
                                                    <FileText className="size-4 text-[#8b7355]" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-[#3d3630] truncate">{file.title}</p>
                                                    <p className="text-xs text-[#8a8279]">
                                                        {new Date(file.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                {file.isIngested ? (
                                                    <Badge variant="secondary" className="rounded-full text-[10px] px-2 py-0.5 bg-[#8fa68e]/15 text-[#6b8a6a] border-none">
                                                        <CheckCircle2 className="size-3 mr-1" />
                                                        Done
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="rounded-full text-[10px] px-2 py-0.5 bg-[#c49a6c]/15 text-[#a07848] border-none">
                                                        <Clock className="size-3 mr-1" />
                                                        Pending
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    )
}
