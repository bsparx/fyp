import { DashboardLoading } from "@/components/route-loading"

export default function Loading() {
    return (
        <DashboardLoading
            title="Preparing dashboard overview"
            subtitle="Collecting system health, activity, and quick actions."
            chips={["Overview", "Realtime"]}
            cardCount={4}
        />
    )
}