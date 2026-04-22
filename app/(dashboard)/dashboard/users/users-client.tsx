"use client"

import { useState } from "react"
import Link from "next/link"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Search,
    Plus,
    MoreHorizontal,
    Mail,
    Shield,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Loader2,
    RefreshCw,
} from "lucide-react"

export interface User {
    id: string
    clerkId: string
    name: string | null
    email: string
    role: "ADMIN" | "DOCTOR" | "PATIENT"
    createdAt: string
}

interface UsersClientProps {
    initialUsers: User[]
}

const roleColors: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    DOCTOR: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    PATIENT: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
}

export default function UsersClient({ initialUsers }: UsersClientProps) {
    const [users, setUsers] = useState<User[]>(initialUsers)
    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 5

    const filteredUsers = users.filter(
        (user) =>
            (user.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.role.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage)

    const handleRefresh = () => {
        window.location.reload()
    }

    return (
        <>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b border-[#e5e0d8] bg-[#fdfcf9]">
                <div className="flex items-center gap-2 px-6">
                    <SidebarTrigger className="-ml-1 text-[#8a8279] hover:text-[#3d3630] hover:bg-[#f0e6c8]/40" />
                    <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4 bg-[#e5e0d8]"
                    />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="/dashboard" className="text-[#8a8279] hover:text-[#3d3630]">Dashboard</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block text-[#e5e0d8]" />
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-[#3d3630] font-medium">All Users</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </header>

            <div className="flex flex-1 flex-col gap-6 p-6 pt-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[#3d3630]">User Management</h1>
                        <p className="text-[#8a8279] mt-1 text-sm">
                            Manage and monitor all users in your hospital system.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={handleRefresh}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Link href="/dashboard/users/new">
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Create User
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* User Table Card */}
                <div className="rounded-xl border bg-card shadow-sm">
                    {/* Search and Filter Header */}
                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between border-b">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search users by name, email, or role..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value)
                                    setCurrentPage(1)
                                }}
                                className="pl-9"
                            />
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Showing {paginatedUsers.length} of {filteredUsers.length} users
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                        User
                                    </th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden md:table-cell">
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4" />
                                            Email
                                        </div>
                                    </th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-4 w-4" />
                                            Role
                                        </div>
                                    </th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden lg:table-cell">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            Created
                                        </div>
                                    </th>
                                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="h-24 text-center text-muted-foreground">
                                            {users.length === 0
                                                ? "No users found. Create your first user to get started."
                                                : "No users found matching your search."}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedUsers.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="border-b transition-colors hover:bg-muted/50"
                                        >
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-medium text-primary">
                                                        {(user.name || user.email)
                                                            .split(" ")
                                                            .map((n) => n[0])
                                                            .join("")
                                                            .slice(0, 2)
                                                            .toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{user.name || "Unnamed User"}</p>
                                                        <p className="text-sm text-muted-foreground md:hidden">
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 hidden md:table-cell">
                                                <span className="text-sm">{user.email}</span>
                                            </td>
                                            <td className="p-4">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[user.role] || "bg-gray-100 text-gray-700"
                                                        }`}
                                                >
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="p-4 hidden lg:table-cell">
                                                <span className="text-sm text-muted-foreground">
                                                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t p-4">
                            <p className="text-sm text-muted-foreground">
                                Page {currentPage} of {totalPages}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
