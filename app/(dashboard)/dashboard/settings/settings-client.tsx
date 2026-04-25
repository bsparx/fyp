"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { getSystemStatus, type SystemStatus } from "./actions"
import {
    Database,
    Server,
    Network,
    ShieldCheck,
    Settings,
    RefreshCw,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Activity,
    HardDrive,
    Key,
    Cpu,
} from "lucide-react"

function StatusBadge({ connected, latency }: { connected: boolean; latency?: number }) {
    if (connected) {
        return (
            <Badge variant="outline" className="gap-1 border-[#8fa68e]/30 bg-[#8fa68e]/10 text-[#6b8a6a]">
                <CheckCircle2 className="size-3" />
                Online
                {latency !== undefined && latency > 0 && <span className="text-[10px]">({latency}ms)</span>}
            </Badge>
        )
    }
    return (
        <Badge variant="outline" className="gap-1 border-red-200 bg-red-50 text-red-600">
            <XCircle className="size-3" />
            Offline
        </Badge>
    )
}

function EnvVarBadge({ present, label }: { present: boolean; label: string }) {
    return (
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#e5e0d8] bg-[#fdfcf9]">
            <span className="text-sm text-[#3d3630]">{label}</span>
            {present ? (
                <CheckCircle2 className="size-4 text-[#8fa68e]" />
            ) : (
                <AlertCircle className="size-4 text-[#c4705a]" />
            )}
        </div>
    )
}

export function SettingsClient({ initialStatus }: { initialStatus: SystemStatus }) {
    const [status, setStatus] = useState<SystemStatus>(initialStatus)
    const [refreshing, setRefreshing] = useState(false)

    const handleRefresh = async () => {
        setRefreshing(true)
        try {
            const newStatus = await getSystemStatus()
            setStatus(newStatus)
            toast.success("System status refreshed")
        } catch (error) {
            toast.error("Failed to refresh status")
        } finally {
            setRefreshing(false)
        }
    }

    const services = [
        {
            key: "database" as const,
            name: "PostgreSQL",
            description: "Primary relational database",
            icon: Database,
            color: "#7a9eaf",
            data: status.database,
            metric: status.database.connected ? `${status.database.latencyMs}ms` : "—",
            metricLabel: "Latency",
        },
        {
            key: "pinecone" as const,
            name: "Pinecone",
            description: "Vector database for embeddings",
            icon: Server,
            color: "#8fa68e",
            data: status.pinecone,
            metric: status.pinecone.vectorCount?.toLocaleString() ?? "—",
            metricLabel: "Vectors",
        },
        {
            key: "neo4j" as const,
            name: "Neo4j",
            description: "Graph database for knowledge graphs",
            icon: Network,
            color: "#c49a6c",
            data: status.neo4j,
            metric: status.neo4j.nodeCount?.toLocaleString() ?? "—",
            metricLabel: "Nodes",
        },
        {
            key: "clerk" as const,
            name: "Clerk",
            description: "Authentication & user management",
            icon: ShieldCheck,
            color: "#8b7355",
            data: status.clerk,
            metric: status.clerk.userCount?.toLocaleString() ?? "—",
            metricLabel: "Users",
        },
    ]

    const envVars = [
        { key: "databaseUrl", label: "DATABASE_URL" },
        { key: "pineconeApiKey", label: "PINECONE_API_KEY" },
        { key: "pineconeIndex", label: "PINECONE_INDEX_NAME" },
        { key: "neo4jUri", label: "NEO4J_URI" },
        { key: "neo4jUser", label: "NEO4J_USER" },
        { key: "clerkSecretKey", label: "CLERK_SECRET_KEY" },
        { key: "openaiKey", label: "OPENAI_API_KEY" },
        { key: "googleAiKey", label: "GOOGLE_GENERATIVE_AI_API_KEY" },
    ]

    const allHealthy = services.every((s) => s.data.connected)

    return (
        <div className="flex flex-1 flex-col gap-6 p-6 pt-4 bg-[#faf6f1]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#3d3630]">System Settings</h1>
                    <p className="text-[#8a8279] mt-1 text-sm">
                        Monitor system health and configure your hospital management platform.
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="border-[#e5e0d8] text-[#3d3630] hover:bg-[#f0e6c8]/30"
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh Status
                </Button>
            </div>

            {/* Overall Health */}
            <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                        <div className={`rounded-xl p-3 ${allHealthy ? "bg-[#8fa68e]/10" : "bg-[#c49a6c]/10"}`}>
                            <Activity className={`size-6 ${allHealthy ? "text-[#8fa68e]" : "text-[#c49a6c]"}`} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-[#3d3630]">System Health</p>
                            <p className="text-xs text-[#8a8279]">
                                {allHealthy
                                    ? "All services are operational"
                                    : `${services.filter((s) => !s.data.connected).length} service(s) experiencing issues`}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className={`text-2xl font-bold ${allHealthy ? "text-[#8fa68e]" : "text-[#c49a6c]"}`}>
                                {services.filter((s) => s.data.connected).length}/{services.length}
                            </p>
                            <p className="text-xs text-[#8a8279]">Services online</p>
                        </div>
                    </div>
                    <Progress
                        value={(services.filter((s) => s.data.connected).length / services.length) * 100}
                        className="h-2 mt-4 bg-[#e8e4e0]"
                    />
                </CardContent>
            </Card>

            {/* Service Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {services.map((service) => (
                    <Card key={service.key} className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div className="rounded-xl p-2.5" style={{ backgroundColor: `${service.color}15` }}>
                                    <service.icon className="size-5" style={{ color: service.color }} />
                                </div>
                                <StatusBadge connected={service.data.connected} latency={service.data.latency} />
                            </div>
                            <div className="mt-3">
                                <p className="text-sm font-medium text-[#3d3630]">{service.name}</p>
                                <p className="text-xs text-[#8a8279]">{service.description}</p>
                            </div>
                            <div className="mt-3 pt-3 border-t border-[#e5e0d8]">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-[#8a8279]">{service.metricLabel}</span>
                                    <span className="text-sm font-semibold text-[#3d3630]">{service.metric}</span>
                                </div>
                            </div>
                            {service.data.message !== "Connected" && service.data.message !== "Not configured" && (
                                <p className="text-xs text-[#c4705a] mt-2">{service.data.message}</p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Environment Variables */}
            <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Key className="size-4 text-[#8b7355]" />
                        <CardTitle className="text-base font-semibold text-[#3d3630]">Environment Configuration</CardTitle>
                    </div>
                    <CardDescription className="text-[#8a8279]">
                        Required API keys and connection strings
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {envVars.map((env) => (
                            <EnvVarBadge key={env.key} present={status.environment[env.key as keyof SystemStatus["environment"]]} label={env.label} />
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* About */}
            <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Settings className="size-4 text-[#8b7355]" />
                        <CardTitle className="text-base font-semibold text-[#3d3630]">About HMS Admin</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="flex items-center gap-3">
                            <Cpu className="size-4 text-[#8a8279]" />
                            <div>
                                <p className="text-xs text-[#8a8279]">Framework</p>
                                <p className="text-sm font-medium text-[#3d3630]">Next.js 16 + React 19</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <HardDrive className="size-4 text-[#8a8279]" />
                            <div>
                                <p className="text-xs text-[#8a8279]">Database</p>
                                <p className="text-sm font-medium text-[#3d3630]">PostgreSQL + Prisma</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Server className="size-4 text-[#8a8279]" />
                            <div>
                                <p className="text-xs text-[#8a8279]">Vector Store</p>
                                <p className="text-sm font-medium text-[#3d3630]">Pinecone + Voyage AI</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Network className="size-4 text-[#8a8279]" />
                            <div>
                                <p className="text-xs text-[#8a8279]">Graph DB</p>
                                <p className="text-sm font-medium text-[#3d3630]">Neo4j</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="size-4 text-[#8a8279]" />
                            <div>
                                <p className="text-xs text-[#8a8279]">Auth</p>
                                <p className="text-sm font-medium text-[#3d3630]">Clerk</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Database className="size-4 text-[#8a8279]" />
                            <div>
                                <p className="text-xs text-[#8a8279]">AI Models</p>
                                <p className="text-sm font-medium text-[#3d3630]">OpenAI + Google Gemini</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
