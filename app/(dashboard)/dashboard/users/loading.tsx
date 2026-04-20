import { DashboardLoading } from "@/components/route-loading"

export default function Loading() {
    return (
        <DashboardLoading
            title="Loading user management"
            subtitle="Fetching accounts, permissions, and document counts."
            chips={["Users", "Management"]}
        />
    )
}