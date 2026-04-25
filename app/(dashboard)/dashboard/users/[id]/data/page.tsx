import { getUserAverageFidelitySummary, getUserById, getUserDocuments } from "../../data/actions"
import UserDataClient from "./user-data-client"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const resolvedParams = await params
    const user = await getUserById(resolvedParams.id)
    return {
        title: user ? `${user.name || user.email} | HMS` : "User Data | HMS",
    }
}

export default async function UserDataPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params
    const userId = resolvedParams.id

    const [user, documentsData, fidelitySummary] = await Promise.all([
        getUserById(userId),
        getUserDocuments(userId, 1),
        getUserAverageFidelitySummary(userId),
    ])

    if (!user) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-muted-foreground">User not found</p>
            </div>
        )
    }

    const userName = user.name || user.email

    return (
        <UserDataClient
            userId={userId}
            userName={userName}
            initialDocuments={documentsData.documents.map((doc) => ({
                ...doc,
                createdAt: doc.createdAt.toISOString(),
            }))}
            initialTotalPages={documentsData.totalPages}
            initialFidelitySummary={fidelitySummary}
        />
    )
}
