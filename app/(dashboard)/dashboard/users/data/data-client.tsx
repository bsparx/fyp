"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
    Search,
    FileText,
    ChevronLeft,
    ChevronRight,
    Stethoscope,
    HeartPulse,
    Crown,
    RefreshCw,
} from "lucide-react"

export interface UserWithDocumentCount {
    id: string
    name: string | null
    email: string
    role: "ADMIN" | "DOCTOR" | "PATIENT"
    createdAt: string
    _count: {
        documents: number
    }
}

interface DataClientProps {
    initialUsers: UserWithDocumentCount[]
}

const roleMeta: Record<string, { label: string; icon: React.ElementType; badge: string; gradient: string }> = {
    ADMIN: {
        label: "Admin",
        icon: Crown,
        badge: "bg-amber-100 text-amber-700 border-amber-200",
        gradient: "from-amber-100/40 to-amber-50/20",
    },
    DOCTOR: {
        label: "Doctor",
        icon: Stethoscope,
        badge: "bg-sky-100 text-sky-700 border-sky-200",
        gradient: "from-sky-100/40 to-sky-50/20",
    },
    PATIENT: {
        label: "Patient",
        icon: HeartPulse,
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
        gradient: "from-emerald-100/40 to-emerald-50/20",
    },
}

export default function DataClient({ initialUsers }: DataClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [users] = useState<UserWithDocumentCount[]>(initialUsers)
    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
    const [currentPage, setCurrentPage] = useState(1)

    const updateUrl = useCallback(
        (search: string) => {
            const params = new URLSearchParams()
            if (search) params.set("search", search)
            const query = params.toString()
            router.replace(`/dashboard/users/data${query ? `?${query}` : ""}`, { scroll: false })
        },
        [router]
    )

    useEffect(() => {
        updateUrl(searchQuery)
    }, [searchQuery, updateUrl])

    const searchInputRef = useRef<HTMLInputElement>(null)

    // / key to focus search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault()
                searchInputRef.current?.focus()
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [])

    const itemsPerPage = 8

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
                    <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 bg-[#e5e0d8]" />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="/dashboard" className="text-[#8a8279] hover:text-[#3d3630]">Dashboard</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block text-[#e5e0d8]" />
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="/dashboard/users" className="text-[#8a8279] hover:text-[#3d3630]">Users</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block text-[#e5e0d8]" />
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-[#3d3630] font-medium">User Data</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </header>

            <div className="flex flex-1 flex-col gap-6 p-6 pt-4 bg-[#faf6f1]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[#3d3630]">User Data</h1>
                        <p className="text-[#8a8279] mt-1 text-sm">
                            View and manage documents for all users in the system.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleRefresh} className="border-[#e5e0d8] bg-[#fdfcf9] text-[#8a8279] hover:text-[#3d3630] hover:bg-[#f0e6c8]/30">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8279]" />
                    <Input
                        ref={searchInputRef}
                        placeholder="Search users by name, email, or role... (press /)"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setCurrentPage(1)
                        }}
                        className="pl-9 bg-[#fdfcf9] border-[#e5e0d8] text-[#3d3630] placeholder:text-[#8a8279]/60"
                    />
                </div>

                {/* User Cards Grid */}
                {paginatedUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-[#e5e0d8] bg-[#fdfcf9]">
                        <FileText className="h-12 w-12 text-[#8a8279]/40 mb-4" />
                        <p className="text-[#3d3630] font-medium">
                            {users.length === 0 ? "No users found." : "No users found matching your search."}
                        </p>
                        <p className="text-sm text-[#8a8279] mt-1">
                            {users.length === 0 ? "Create users first to see their data here." : "Try a different search term."}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {paginatedUsers.map((user) => {
                            const meta = roleMeta[user.role]
                            return (
                                <Link key={user.id} href={`/dashboard/users/${user.id}/data`} className="group">
                                    <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm hover:shadow-md hover:border-[#c4a882]/30 transition-all duration-200 overflow-hidden">
                                        <CardContent className="p-0">
                                            <div className={`h-1.5 w-full bg-gradient-to-r ${meta.gradient}`} />
                                            <div className="p-5">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className={`flex h-12 w-12 items-center justify-center rounded-full ${meta.badge.split(" ")[0]} font-medium text-lg`}>
                                                        <meta.icon className="size-5" />
                                                    </div>
                                                    <div className="flex items-center gap-1 text-sm text-[#8a8279] bg-[#f5f0eb] rounded-full px-2.5 py-1">
                                                        <FileText className="h-3.5 w-3.5" />
                                                        <span className="font-medium">{user._count.documents}</span>
                                                    </div>
                                                </div>
                                                <h3 className="font-semibold text-lg mb-1 truncate text-[#3d3630]">
                                                    {user.name || "Unnamed User"}
                                                </h3>
                                                <p className="text-sm text-[#8a8279] truncate mb-3">
                                                    {user.email}
                                                </p>
                                                <Badge variant="outline" className={`text-xs font-medium ${meta.badge}`}>
                                                    {meta.label}
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            )
                        })}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-[#8a8279]">
                            Page {currentPage} of {totalPages} • {filteredUsers.length} users total
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline" size="sm"
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="border-[#e5e0d8] text-[#3d3630] hover:bg-[#f0e6c8]/30"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>
                            <Button
                                variant="outline" size="sm"
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="border-[#e5e0d8] text-[#3d3630] hover:bg-[#f0e6c8]/30"
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
