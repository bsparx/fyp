import { getDashboardStats } from "./actions"
import DashboardClient from "./dashboard-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Dashboard | HMS",
}

export default async function DashboardPage() {
    const stats = await getDashboardStats()
    return <DashboardClient initialStats={stats} />
}
