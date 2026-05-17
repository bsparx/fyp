"use client"

import dynamic from "next/dynamic"
import { useMemo, useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import type { DatabaseFullGraph } from "@/app/(dashboard)/dashboard/database/actions"

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full w-full bg-[#eef2f7] rounded-xl border border-[#d0d9e8]">
            <div className="text-center space-y-3">
                <div className="relative mx-auto" style={{ width: 40, height: 40 }}>
                    <div className="absolute inset-0 rounded-full border-2 border-[#d0d9e8] border-t-[#5b7cfa] animate-spin" />
                    <div className="absolute inset-2 rounded-full border-2 border-[#d0d9e8] border-b-[#38bdf8] animate-spin" style={{ animationDirection: "reverse" }} />
                </div>
                <p className="text-sm text-[#6b7d99]">Rendering graph...</p>
            </div>
        </div>
    ),
})

// Warm earth-tone palette for node types
const NODE_COLORS: Record<string, string> = {
    Patient: "#38bdf8",
    Report: "#4ade80",
    Observation: "#8aa4f0",
    Metric: "#e74c3c",
    Document: "#5b7cfa",
    Entity: "#fbbf24",
    Medicine: "#38bdf8",
    Disease: "#e74c3c",
}

const DEFAULT_NODE_COLOR = "#6b7d99"

function getNodeColor(type: string) {
    return NODE_COLORS[type] || DEFAULT_NODE_COLOR
}

interface GraphVisualizationProps {
    graphData: DatabaseFullGraph
    height?: number
}

export function GraphVisualization({ graphData, height = 500 }: GraphVisualizationProps) {
    const [highlightedNode, setHighlightedNode] = useState<string | null>(null)

    const data = useMemo(() => {
        const nodes = graphData.nodes.map((node) => ({
            id: node.id,
            val: node.type === "Patient" ? 8 : node.type === "Report" ? 6 : 4,
            color: getNodeColor(node.type),
            label: node.label,
            type: node.type,
            properties: node.properties,
        }))

        const links = graphData.edges.map((edge) => ({
            source: edge.source,
            target: edge.target,
            label: edge.type,
            color: "#8aa4f0",
        }))

        return { nodes, links }
    }, [graphData])

    const handleNodeClick = useCallback((node: any) => {
        setHighlightedNode((prev) => (prev === node.id ? null : node.id))
    }, [])

    const nodeCanvasObject = useCallback(
        (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.label || node.id
            const fontSize = Math.max(10 / globalScale, 3)
            ctx.font = `${fontSize}px Inter, system-ui, sans-serif`
            const textWidth = ctx.measureText(label).width
            const bckgDimensions = [textWidth + fontSize * 1.2, fontSize * 1.8].map((n) => n + fontSize * 0.2)

            // Draw node circle
            const radius = Math.sqrt(node.val) * 3
            ctx.beginPath()
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
            ctx.fillStyle = node.color
            ctx.fill()

            // Highlight ring if selected
            if (highlightedNode === node.id) {
                ctx.beginPath()
                ctx.arc(node.x, node.y, radius + 3, 0, 2 * Math.PI)
                ctx.strokeStyle = "#1e2a3a"
                ctx.lineWidth = 2
                ctx.stroke()
            }

            // Draw label background
            ctx.fillStyle = "rgba(253, 252, 249, 0.92)"
            ctx.beginPath()
            ctx.roundRect(
                node.x - bckgDimensions[0] / 2,
                node.y + radius + 2,
                bckgDimensions[0],
                bckgDimensions[1],
                3
            )
            ctx.fill()

            // Draw label text
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.fillStyle = "#1e2a3a"
            ctx.fillText(label, node.x, node.y + radius + 2 + bckgDimensions[1] / 2)
        },
        [highlightedNode]
    )

    const linkCanvasObject = useCallback(
        (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            // Only draw label on hover or if scale is close enough
            if (globalScale < 1.2) return

            const start = link.source
            const end = link.target
            const textPos = {
                x: start.x + (end.x - start.x) * 0.5,
                y: start.y + (end.y - start.y) * 0.5,
            }

            const fontSize = Math.max(8 / globalScale, 2.5)
            ctx.font = `${fontSize}px Inter, system-ui, sans-serif`
            const textWidth = ctx.measureText(link.label).width

            ctx.fillStyle = "rgba(253, 252, 249, 0.9)"
            ctx.beginPath()
            ctx.roundRect(textPos.x - textWidth / 2 - 3, textPos.y - fontSize / 2 - 2, textWidth + 6, fontSize + 4, 2)
            ctx.fill()

            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.fillStyle = "#6b7d99"
            ctx.fillText(link.label, textPos.x, textPos.y)
        },
        []
    )

    const nodeTypeCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        graphData.nodes.forEach((n) => {
            counts[n.type] = (counts[n.type] || 0) + 1
        })
        return Object.entries(counts).map(([type, count]) => ({ type, count }))
    }, [graphData.nodes])

    return (
        <div className="space-y-3">
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[#6b7d99] font-medium">Legend:</span>
                {nodeTypeCounts.map(({ type }) => (
                    <button
                        key={type}
                        onClick={() => setHighlightedNode(null)}
                        className="flex items-center gap-1.5 text-xs"
                    >
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getNodeColor(type) }} />
                        <span className="text-[#1e2a3a]">{type}</span>
                    </button>
                ))}
                <Badge variant="outline" className="ml-auto text-[10px] border-[#d0d9e8] text-[#6b7d99]">
                    Click node to highlight • Scroll to zoom • Drag to pan
                </Badge>
            </div>

            {/* Graph */}
            <div
                className="rounded-xl border border-[#d0d9e8] bg-[#eef2f7] overflow-hidden"
                style={{ height }}
            >
                <ForceGraph2D
                    graphData={data}
                    nodeCanvasObject={nodeCanvasObject}
                    linkCanvasObject={linkCanvasObject}
                    linkColor={() => "#8aa4f0"}
                    linkWidth={1}
                    linkDirectionalArrowLength={4}
                    linkDirectionalArrowRelPos={1}
                    onNodeClick={handleNodeClick}
                    enableNodeDrag={true}
                    warmupTicks={100}
                    cooldownTicks={50}
                    d3AlphaDecay={0.02}
                    d3VelocityDecay={0.3}
                    backgroundColor="#eef2f7"
                />
            </div>

            {/* Selected node info */}
            {highlightedNode && (
                <div className="rounded-lg border border-[#d0d9e8] bg-[#ffffff] p-3">
                    {(() => {
                        const node = graphData.nodes.find((n) => n.id === highlightedNode)
                        if (!node) return null
                        return (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-[#1e2a3a]">{node.label}</span>
                                    <Badge variant="secondary" className="bg-[#dbe4f5]/60 text-[#5b7cfa]">{node.type}</Badge>
                                </div>
                                <p className="text-xs text-[#6b7d99] font-mono">{node.id}</p>
                                {Object.keys(node.properties).length > 0 && (
                                    <div className="grid gap-1 pt-1 border-t border-[#d0d9e8]">
                                        {Object.entries(node.properties).map(([key, value]) => (
                                            <p key={key} className="text-xs text-[#6b7d99]">
                                                <span className="font-medium text-[#1e2a3a]/80">{key}:</span>{" "}
                                                {value ?? "null"}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })()}
                </div>
            )}
        </div>
    )
}
