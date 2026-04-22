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
} from "lucide-react"

const stats = [
    {
        title: "Total Users",
        value: "1,234",
        change: "+12%",
        trend: "up",
        icon: Users,
        color: "#8b7355",
        bgColor: "bg-[#8b7355]/10",
    },
    {
        title: "Documents",
        value: "567",
        change: "+5%",
        trend: "up",
        icon: FileText,
        color: "#7a9eaf",
        bgColor: "bg-[#7a9eaf]/10",
    },
    {
        title: "Vector Entries",
        value: "12.4K",
        change: "+18%",
        trend: "up",
        icon: Database,
        color: "#8fa68e",
        bgColor: "bg-[#8fa68e]/10",
    },
    {
        title: "System Health",
        value: "98%",
        change: "-1%",
        trend: "down",
        icon: Activity,
        color: "#c49a6c",
        bgColor: "bg-[#c49a6c]/10",
    },
]

const recentUploads = [
    { name: "patient_records_2024.pdf", date: "2 hours ago", size: "2.4 MB", status: "processed" },
    { name: "medical_guidelines.pdf", date: "5 hours ago", size: "1.8 MB", status: "processed" },
    { name: "treatment_protocols.pdf", date: "1 day ago", size: "4.1 MB", status: "processing" },
    { name: "lab_results_q1.pdf", date: "2 days ago", size: "3.2 MB", status: "processed" },
]

const quickActions = [
    {
        title: "Upload Documents",
        description: "Add PDFs to the vector database",
        href: "/dashboard/upload",
        icon: FileText,
        color: "#8b7355",
    },
    {
        title: "Manage Users",
        description: "Add, edit, or remove users",
        href: "/dashboard/users",
        icon: Users,
        color: "#7a9eaf",
    },
    {
        title: "Browse Database",
        description: "Search indexed documents",
        href: "/dashboard/database",
        icon: Database,
        color: "#8fa68e",
    },
    {
        title: "View Statistics",
        description: "System analytics and metrics",
        href: "/dashboard/database/stats",
        icon: Activity,
        color: "#c49a6c",
    },
]

const systemStatus = [
    { label: "Database Connection", status: "healthy", value: 100 },
    { label: "Vector Store", status: "healthy", value: 98 },
    { label: "File Processing", status: "healthy", value: 95 },
    { label: "API Latency", status: "warning", value: 82 },
]

export default function DashboardPage() {
    return (
        <>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b border-[#e5e0d8] bg-[#fdfcf9]">
                <div className="flex items-center gap-2 px-6">
                    <SidebarTrigger className="-ml-1 text-[#8a8279] hover:text-[#3d3630] hover:bg-[#f0e6c8]/40" />
                    <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4 bg-[#e5e0d8]"
                    />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-[#3d3630] font-medium">Dashboard</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </header>
            <div className="flex flex-1 flex-col gap-6 p-6 pt-4">
                {/* Welcome Section */}
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="rounded-full px-3 py-1 bg-[#f0e6c8]/60 text-[#8b7355] border-none font-medium text-xs">
                                Overview
                            </Badge>
                            <Badge variant="outline" className="rounded-full px-3 py-1 text-[#8a8279] border-[#e5e0d8] text-xs">
                                Realtime
                            </Badge>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-[#3d3630]">Hospital Management System</h1>
                        <p className="text-[#8a8279] mt-1 text-sm">
                            Welcome back. Here's what's happening across your healthcare infrastructure.
                        </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-xs text-[#8a8279] bg-[#fdfcf9] border border-[#e5e0d8] rounded-full px-3 py-1.5">
                        <Clock className="size-3.5" />
                        <span>Last updated: Just now</span>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat) => (
                        <Card key={stat.title} className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between">
                                    <div className={`rounded-xl ${stat.bgColor} p-2.5`}>
                                        <stat.icon className="size-5" style={{ color: stat.color }} />
                                    </div>
                                    <div className={`flex items-center gap-0.5 text-xs font-medium ${stat.trend === "up" ? "text-[#8fa68e]" : "text-[#c4705a]"}`}>
                                        {stat.trend === "up" ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                                        {stat.change}
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <p className="text-xs text-[#8a8279] font-medium uppercase tracking-wide">{stat.title}</p>
                                    <h3 className="text-2xl font-bold text-[#3d3630] mt-0.5">{stat.value}</h3>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Quick Actions - Takes 2 columns */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold text-[#3d3630]">Quick Actions</CardTitle>
                                <CardDescription className="text-[#8a8279] text-sm">Common tasks and workflows</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {quickActions.map((action) => (
                                        <a
                                            key={action.title}
                                            href={action.href}
                                            className="group flex items-start gap-3 p-3.5 rounded-xl border border-[#e5e0d8] bg-[#faf6f1] hover:bg-[#f0e6c8]/30 hover:border-[#c4a882]/40 transition-all"
                                        >
                                            <div className="rounded-lg p-2 mt-0.5" style={{ backgroundColor: `${action.color}15` }}>
                                                <action.icon className="size-4" style={{ color: action.color }} />
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
                        <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
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
                                    {recentUploads.map((file, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between p-3 rounded-lg hover:bg-[#f0e6c8]/20 transition-colors group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="rounded-lg bg-[#f0e6c8]/40 p-2 shrink-0">
                                                    <FileText className="size-4 text-[#8b7355]" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-[#3d3630] truncate">{file.name}</p>
                                                    <p className="text-xs text-[#8a8279]">{file.size}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="text-xs text-[#8a8279]">{file.date}</span>
                                                {file.status === "processed" ? (
                                                    <Badge variant="secondary" className="rounded-full text-[10px] px-2 py-0.5 bg-[#8fa68e]/15 text-[#6b8a6a] border-none">
                                                        <CheckCircle2 className="size-3 mr-1" />
                                                        Done
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="rounded-full text-[10px] px-2 py-0.5 bg-[#c49a6c]/15 text-[#a07848] border-none">
                                                        <Clock className="size-3 mr-1" />
                                                        Processing
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - System Status */}
                    <div className="space-y-6">
                        <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold text-[#3d3630]">System Health</CardTitle>
                                <CardDescription className="text-[#8a8279] text-sm mt-0.5">Real-time service status</CardDescription>
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
                                        <Progress
                                            value={service.value}
                                            className="h-1.5 bg-[#e8e4e0]"
                                        />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Activity Card */}
                        <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold text-[#3d3630]">Today's Activity</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#8fa68e]/8">
                                    <Users className="size-4 text-[#8fa68e]" />
                                    <div className="flex-1">
                                        <p className="text-sm text-[#3d3630]">3 new users registered</p>
                                        <p className="text-xs text-[#8a8279]">In the last 24 hours</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#7a9eaf]/8">
                                    <FileText className="size-4 text-[#7a9eaf]" />
                                    <div className="flex-1">
                                        <p className="text-sm text-[#3d3630]">12 documents uploaded</p>
                                        <p className="text-xs text-[#8a8279]">2.4 GB total size</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#c49a6c]/8">
                                    <Database className="size-4 text-[#c49a6c]" />
                                    <div className="flex-1">
                                        <p className="text-sm text-[#3d3630]">1,240 vectors indexed</p>
                                        <p className="text-xs text-[#8a8279]">Embedding updated</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    )
}
