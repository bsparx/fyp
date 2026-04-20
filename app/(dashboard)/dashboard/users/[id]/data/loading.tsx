import { DashboardLoading } from "@/components/route-loading"

export default function Loading() {
    return (
        <DashboardLoading
            title="Loading patient profile data"
            subtitle="Gathering document history and fidelity summaries."
            chips={["Patient Data", "Fidelity"]}
        />
    )
}