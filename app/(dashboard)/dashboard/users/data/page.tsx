import { getAllUsersWithDocumentCount } from "./actions"
import DataClient from "./data-client"

export default async function UserDataPage() {
    const users = await getAllUsersWithDocumentCount()

    return <DataClient initialUsers={users} />
}
