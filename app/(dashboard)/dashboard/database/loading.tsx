import { DashboardLoading } from "@/components/route-loading"

export default function Loading() {
    return (
        <DashboardLoading
            title="Loading document browser"
            subtitle="Fetching indexed files and preparing database controls."
            chips={["Database", "Documents"]}
        />
    )
}