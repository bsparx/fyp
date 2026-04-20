import { DashboardLoading } from "@/components/route-loading"

export default function Loading() {
    return (
        <DashboardLoading
            title="Opening new user setup"
            subtitle="Preparing account creation form and validation helpers."
            chips={["Create User", "Provisioning"]}
            cardCount={2}
        />
    )
}