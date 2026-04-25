import { getUsersWithDocumentCountByRoles } from "./actions"
import DataClient from "./data-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "User Data | HMS",
}

export default async function UserDataPage() {
    const users = await getUsersWithDocumentCountByRoles(["PATIENT"])

    return <DataClient initialUsers={users} />
}
