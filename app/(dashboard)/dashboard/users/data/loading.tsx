import { DashboardLoading } from "@/components/route-loading"

export default function Loading() {
    return (
        <DashboardLoading
            title="Preparing user data table"
            subtitle="Syncing user records and linked documents for analysis."
            chips={["User Data", "Reports"]}
        />
    )
}