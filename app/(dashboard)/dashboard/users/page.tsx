import { getAllUsersWithDocumentCount } from "./data/actions"
import UsersClient from "./users-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Users | HMS",
}

export default async function UsersPage() {
    const users = await getAllUsersWithDocumentCount()

    return <UsersClient initialUsers={users} />
}
