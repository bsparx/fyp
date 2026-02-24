import { getAllUsersWithDocumentCount } from "./data/actions"
import UsersClient from "./users-client"

export default async function UsersPage() {
    const users = await getAllUsersWithDocumentCount()

    return <UsersClient initialUsers={users} />
}
