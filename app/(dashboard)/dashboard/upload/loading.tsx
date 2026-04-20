import { DashboardLoading } from "@/components/route-loading"

export default function Loading() {
    return (
        <DashboardLoading
            title="Preparing document upload"
            subtitle="Initializing file pipeline and ingestion controls."
            chips={["Upload", "Ingestion"]}
            cardCount={2}
        />
    )
}