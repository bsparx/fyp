"use client";

import * as React from "react";
import {
    FileText,
    Database,
    Layers,
    CheckCircle,
    TrendingUp,
    Activity,
    PieChart as PieChartIcon,
    BarChart3,
    Clock,
} from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
} from "@/components/ui/chart";
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
} from "recharts";
import { type DatabaseStats } from "../actions";

interface StatsClientProps {
    stats: DatabaseStats;
}

const pieChartConfig = {
    ingested: { label: "Ingested", color: "hsl(var(--chart-1))" },
    pending: { label: "Pending", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const areaChartConfig = {
    count: { label: "Documents", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const barChartConfig = {
    parentChunks: { label: "Parent Chunks", color: "hsl(var(--chart-1))" },
    ragChunks: { label: "RAG Chunks", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

export function StatsClient({ stats }: StatsClientProps) {
    const pieData = [
        { name: "Ingested", value: stats.ingestedDocuments, fill: "hsl(var(--chart-1))" },
        { name: "Pending", value: stats.totalDocuments - stats.ingestedDocuments, fill: "hsl(var(--chart-2))" },
    ];

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    };

    return (
        <div className="grid gap-6">
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-[#3d3630]">Total Documents</CardTitle>
                        <FileText className="h-4 w-4 text-[#8a8279]" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-[#3d3630]">{stats.totalDocuments}</div>
                        <p className="text-xs text-[#8a8279]">{stats.ingestedDocuments} ingested</p>
                    </CardContent>
                </Card>

                <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-[#3d3630]">Parent Chunks</CardTitle>
                        <Layers className="h-4 w-4 text-[#8a8279]" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-[#3d3630]">{stats.totalParentChunks.toLocaleString()}</div>
                        <p className="text-xs text-[#8a8279]">Grouped content sections</p>
                    </CardContent>
                </Card>

                <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-[#3d3630]">RAG Chunks</CardTitle>
                        <Database className="h-4 w-4 text-[#8a8279]" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-[#3d3630]">{stats.totalRagChunks.toLocaleString()}</div>
                        <p className="text-xs text-[#8a8279]">Vectors in Pinecone</p>
                    </CardContent>
                </Card>

                <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-[#3d3630]">Ingestion Rate</CardTitle>
                        <CheckCircle className="h-4 w-4 text-[#8a8279]" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-[#3d3630]">{stats.ingestionRate.toFixed(1)}%</div>
                        <Progress value={stats.ingestionRate} className="mt-2 h-1.5 bg-[#e8e4e0]" />
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-[#8a8279]" />
                            <CardTitle className="text-[#3d3630]">Documents Over Time</CardTitle>
                        </div>
                        <CardDescription className="text-[#8a8279]">Document uploads in the last 30 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.documentsPerDay.length > 0 ? (
                            <ChartContainer config={areaChartConfig} className="h-[250px] w-full">
                                <AreaChart data={stats.documentsPerDay} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                        tick={{ fill: "#8a8279", fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis tick={{ fill: "#8a8279", fontSize: 12 }} tickLine={false} axisLine={false} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Area type="monotone" dataKey="count" stroke="hsl(var(--chart-1))" fillOpacity={1} fill="url(#colorCount)" />
                                </AreaChart>
                            </ChartContainer>
                        ) : (
                            <div className="flex h-[250px] items-center justify-center text-[#8a8279]">
                                <div className="text-center">
                                    <Activity className="mx-auto h-8 w-8 opacity-50" />
                                    <p className="mt-2">No data available</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <PieChartIcon className="h-4 w-4 text-[#8a8279]" />
                            <CardTitle className="text-[#3d3630]">Document Status</CardTitle>
                        </div>
                        <CardDescription className="text-[#8a8279]">Ingested vs pending documents</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.totalDocuments > 0 ? (
                            <ChartContainer config={pieChartConfig} className="mx-auto h-[250px] w-full max-w-[300px]">
                                <PieChart>
                                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={2}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ChartContainer>
                        ) : (
                            <div className="flex h-[250px] items-center justify-center text-[#8a8279]">
                                <div className="text-center">
                                    <PieChartIcon className="mx-auto h-8 w-8 opacity-50" />
                                    <p className="mt-2">No documents yet</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-[#8a8279]" />
                            <CardTitle className="text-[#3d3630]">Chunks per Document</CardTitle>
                        </div>
                        <CardDescription className="text-[#8a8279]">Top 10 documents by chunk count</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.chunksPerDocument.length > 0 ? (
                            <ChartContainer config={barChartConfig} className="h-[300px] w-full">
                                <BarChart data={stats.chunksPerDocument} layout="vertical" margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                                    <XAxis type="number" tick={{ fill: "#8a8279", fontSize: 12 }} tickLine={false} axisLine={false} />
                                    <YAxis
                                        dataKey="title"
                                        type="category"
                                        width={120}
                                        tick={{ fill: "#8a8279", fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => (value.length > 15 ? value.substring(0, 15) + "..." : value)}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="parentChunks" stackId="a" fill="hsl(var(--chart-1))" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="ragChunks" stackId="a" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="flex h-[300px] items-center justify-center text-[#8a8279]">
                                <div className="text-center">
                                    <BarChart3 className="mx-auto h-8 w-8 opacity-50" />
                                    <p className="mt-2">No ingested documents</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-[#8a8279]" />
                            <CardTitle className="text-[#3d3630]">Recent Documents</CardTitle>
                        </div>
                        <CardDescription className="text-[#8a8279]">Latest uploaded documents</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.recentDocuments.length > 0 ? (
                            <div className="space-y-3">
                                {stats.recentDocuments.map((doc) => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[#f5f0eb] transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0e6c8]/40">
                                                <FileText className="h-5 w-5 text-[#8b7355]" />
                                            </div>
                                            <div>
                                                <p className="font-medium leading-none text-[#3d3630]">
                                                    {doc.title.length > 30 ? doc.title.substring(0, 30) + "..." : doc.title}
                                                </p>
                                                <p className="text-sm text-[#8a8279]">{formatDate(doc.createdAt)}</p>
                                            </div>
                                        </div>
                                        <Badge variant={doc.isIngested ? "default" : "secondary"} className={doc.isIngested ? "bg-[#8fa68e]/15 text-[#6b8a6a] border-none hover:bg-[#8fa68e]/25" : "bg-[#c49a6c]/15 text-[#a07848] border-none hover:bg-[#c49a6c]/25"}>
                                            {doc.isIngested ? "Ingested" : "Pending"}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex h-[200px] items-center justify-center text-[#8a8279]">
                                <div className="text-center">
                                    <FileText className="mx-auto h-8 w-8 opacity-50" />
                                    <p className="mt-2">No documents yet</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Summary Statistics */}
            <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                <CardHeader>
                    <CardTitle className="text-[#3d3630]">Summary</CardTitle>
                    <CardDescription className="text-[#8a8279]">Key metrics at a glance</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm text-[#8a8279]">Avg Chunks per Document</span>
                            <span className="text-2xl font-bold text-[#3d3630]">{stats.avgChunksPerDocument.toFixed(1)}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-sm text-[#8a8279]">Parent to RAG Ratio</span>
                            <span className="text-2xl font-bold text-[#3d3630]">
                                {stats.totalParentChunks > 0 ? `1:${(stats.totalRagChunks / stats.totalParentChunks).toFixed(1)}` : "N/A"}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-sm text-[#8a8279]">Pending Documents</span>
                            <span className="text-2xl font-bold text-[#3d3630]">{stats.totalDocuments - stats.ingestedDocuments}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-sm text-[#8a8279]">Database Health</span>
                            <Badge
                                variant={stats.ingestionRate === 100 ? "default" : stats.ingestionRate >= 80 ? "secondary" : "destructive"}
                                className="w-fit mt-1"
                            >
                                {stats.ingestionRate === 100 ? "Excellent" : stats.ingestionRate >= 80 ? "Good" : "Needs Attention"}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
