import { getUserById, getUserDocuments } from "../../data/actions"
import UserDataClient from "./user-data-client"

export default async function UserDataPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params
    const userId = resolvedParams.id

    // Fetch user details and documents in parallel
    const [user, documentsData] = await Promise.all([
        getUserById(userId),
        getUserDocuments(userId, 1),
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
        />
    )
}
