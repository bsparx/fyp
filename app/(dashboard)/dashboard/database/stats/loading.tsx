import { DashboardLoading } from "@/components/route-loading"

export default function Loading() {
    return (
        <DashboardLoading
            title="Compiling database statistics"
            subtitle="Aggregating metrics, trends, and performance indicators."
            chips={["Metrics", "Analytics"]}
        />
    )
}