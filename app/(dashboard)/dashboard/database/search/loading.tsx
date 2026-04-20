import { DashboardLoading } from "@/components/route-loading"

export default function Loading() {
    return (
        <DashboardLoading
            title="Warming up hybrid search"
            subtitle="Connecting vector and graph retrieval contexts for faster queries."
            chips={["Hybrid", "Semantic"]}
            cardCount={2}
        />
    )
}