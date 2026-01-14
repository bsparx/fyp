import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
    Users,
    FileText,
    Database,
    Activity
} from "lucide-react"

export default function DashboardPage() {
    return (
        <>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4"
                    />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbPage>Dashboard</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </header>
            <div className="flex flex-1 flex-col gap-6 p-6 pt-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Hospital Management System</h1>
                    <p className="text-muted-foreground mt-2">
                        Welcome to the admin dashboard. Manage users, upload documents, and monitor system health.
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="rounded-lg bg-primary/10 p-3">
                                <Users className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                                <h3 className="text-2xl font-bold">1,234</h3>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="rounded-lg bg-blue-500/10 p-3">
                                <FileText className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Documents</p>
                                <h3 className="text-2xl font-bold">567</h3>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="rounded-lg bg-green-500/10 p-3">
                                <Database className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Vector Entries</p>
                                <h3 className="text-2xl font-bold">12.4K</h3>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="rounded-lg bg-orange-500/10 p-3">
                                <Activity className="h-6 w-6 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">System Health</p>
                                <h3 className="text-2xl font-bold">98%</h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <h3 className="text-lg font-semibold mb-4">Recent Uploads</h3>
                        <div className="space-y-4">
                            {[
                                { name: "patient_records_2024.pdf", date: "2 hours ago" },
                                { name: "medical_guidelines.pdf", date: "5 hours ago" },
                                { name: "treatment_protocols.pdf", date: "1 day ago" },
                            ].map((file, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{file.name}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{file.date}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <a
                                href="/dashboard/upload"
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                            >
                                <FileText className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-medium text-sm">Upload Documents</p>
                                    <p className="text-xs text-muted-foreground">Add PDFs to the vector database</p>
                                </div>
                            </a>
                            <a
                                href="/dashboard/users"
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                            >
                                <Users className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-medium text-sm">Manage Users</p>
                                    <p className="text-xs text-muted-foreground">Add, edit, or remove users</p>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
