"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Search,
    Plus,
    Mail,
    Shield,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Loader2,
    RefreshCw,
    Pencil,
    Trash2,
    Users,
    Stethoscope,
    HeartPulse,
    Crown,
    Filter,
    X,
    Copy,
    Check,
    Download,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { editUser, deleteUser } from "./data/actions"
import { timeAgo } from "@/lib/time-ago"

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

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    const handleCopy = async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    return (
        <button
            onClick={handleCopy}
            className="text-[#8a8279] hover:text-[#8b7355] transition-colors p-1 rounded hover:bg-[#f0e6c8]/30"
            title="Copy"
        >
            {copied ? <Check className="size-3 text-[#8fa68e]" /> : <Copy className="size-3" />}
        </button>
    )
}

const roleMeta: Record<string, { label: string; icon: React.ElementType; badge: string }> = {
    ADMIN: {
        label: "Admin",
        icon: Crown,
        badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    },
    DOCTOR: {
        label: "Doctor",
        icon: Stethoscope,
        badge: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800",
    },
    PATIENT: {
        label: "Patient",
        icon: HeartPulse,
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
    },
}

export default function UsersClient({ initialUsers }: UsersClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [users, setUsers] = useState<User[]>(initialUsers)
    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
    const [roleFilter, setRoleFilter] = useState<string>(searchParams.get("role") || "ALL")
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 8

    const updateUrl = useCallback(
        (search: string, role: string) => {
            const params = new URLSearchParams()
            if (search) params.set("search", search)
            if (role && role !== "ALL") params.set("role", role)
            const query = params.toString()
            router.replace(`/dashboard/users${query ? `?${query}` : ""}`, { scroll: false })
        },
        [router]
    )

    useEffect(() => {
        updateUrl(searchQuery, roleFilter)
    }, [searchQuery, roleFilter, updateUrl])

    const [editUserData, setEditUserData] = useState<User | null>(null)
    const [editName, setEditName] = useState("")
    const [editEmail, setEditEmail] = useState("")
    const [editRole, setEditRole] = useState<"ADMIN" | "DOCTOR" | "PATIENT">("PATIENT")
    const [editLoading, setEditLoading] = useState(false)

    const [deleteUserData, setDeleteUserData] = useState<User | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const [sortColumn, setSortColumn] = useState<"name" | "email" | "role" | "createdAt" | null>(null)
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

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

    const handleSort = (column: "name" | "email" | "role" | "createdAt") => {
        if (sortColumn === column) {
            setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
        } else {
            setSortColumn(column)
            setSortDirection("asc")
        }
    }

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            (user.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.role.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesRole = roleFilter === "ALL" || user.role === roleFilter
        return matchesSearch && matchesRole
    })

    const sortedUsers = React.useMemo(() => {
        if (!sortColumn) return filteredUsers
        const sorted = [...filteredUsers]
        sorted.sort((a, b) => {
            let comparison = 0
            switch (sortColumn) {
                case "name":
                    comparison = (a.name || "").localeCompare(b.name || "")
                    break
                case "email":
                    comparison = a.email.localeCompare(b.email)
                    break
                case "role":
                    comparison = a.role.localeCompare(b.role)
                    break
                case "createdAt":
                    comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    break
            }
            return sortDirection === "asc" ? comparison : -comparison
        })
        return sorted
    }, [filteredUsers, sortColumn, sortDirection])

    const totalPages = Math.ceil(sortedUsers.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedUsers = sortedUsers.slice(startIndex, startIndex + itemsPerPage)

    const handleRefresh = () => {
        window.location.reload()
    }

    const handleExportCSV = () => {
        const headers = ["Name", "Email", "Role", "Created At"]
        const rows = filteredUsers.map((u) => [
            u.name || "Unnamed",
            u.email,
            u.role,
            new Date(u.createdAt).toISOString(),
        ])
        const csv = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n")
        const blob = new Blob([csv], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success("CSV exported", { description: `${filteredUsers.length} users exported.` })
    }

    const openEditDialog = (user: User) => {
        setEditUserData(user)
        setEditName(user.name || "")
        setEditEmail(user.email)
        setEditRole(user.role)
    }

    const closeEditDialog = () => {
        setEditUserData(null)
        setEditName("")
        setEditEmail("")
        setEditRole("PATIENT")
        setEditLoading(false)
    }

    const handleEditSubmit = async () => {
        if (!editUserData) return
        setEditLoading(true)
        const result = await editUser(
            editUserData.id,
            editUserData.clerkId,
            editName,
            editEmail,
            editRole
        )
        if (result.success && result.user) {
            setUsers((prev) =>
                prev.map((u) =>
                    u.id === result.user!.id
                        ? { ...u, name: result.user!.name, email: result.user!.email, role: result.user!.role }
                        : u
                )
            )
            toast.success("User updated successfully", {
                description: `${result.user.name || result.user.email} has been updated.`,
            })
            closeEditDialog()
        } else {
            toast.error("Failed to update user", { description: result.message })
            setEditLoading(false)
        }
    }

    const openDeleteDialog = (user: User) => {
        setDeleteUserData(user)
    }

    const closeDeleteDialog = () => {
        setDeleteUserData(null)
        setDeleteLoading(false)
    }

    const handleDeleteConfirm = async () => {
        if (!deleteUserData) return
        setDeleteLoading(true)
        const result = await deleteUser(deleteUserData.id, deleteUserData.clerkId)
        if (result.success) {
            setUsers((prev) => prev.filter((u) => u.id !== deleteUserData.id))
            toast.success("User deleted", {
                description: `${deleteUserData.name || deleteUserData.email} has been removed.`,
            })
            closeDeleteDialog()
        } else {
            toast.error("Failed to delete user", { description: result.message })
            setDeleteLoading(false)
        }
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
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-[#3d3630] font-medium">All Users</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </header>

            <div className="flex flex-1 flex-col gap-6 p-6 pt-4 bg-[#faf6f1]">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[#3d3630]">User Management</h1>
                        <p className="text-[#8a8279] mt-1 text-sm">
                            Manage and monitor all users in your hospital system.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={handleRefresh} className="border-[#e5e0d8] bg-[#fdfcf9] text-[#8a8279] hover:text-[#3d3630] hover:bg-[#f0e6c8]/30">
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" onClick={handleExportCSV} className="gap-2 border-[#e5e0d8] text-[#3d3630] hover:bg-[#f0e6c8]/30">
                            <Download className="h-4 w-4" />
                            Export
                        </Button>
                        <Link href="/dashboard/users/new">
                            <Button className="gap-2 bg-[#8b7355] hover:bg-[#6b5a42] text-white">
                                <Plus className="h-4 w-4" />
                                Create User
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-3">
                    {["ADMIN", "DOCTOR", "PATIENT"].map((role) => {
                        const meta = roleMeta[role]
                        const count = users.filter((u) => u.role === role).length
                        return (
                            <Card key={role} className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className={`rounded-xl p-2.5 ${meta.badge.replace("text-", "bg-").replace("700", "100").split(" ")[0]}`}>
                                        <meta.icon className="size-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-[#8a8279] font-medium uppercase tracking-wide">{meta.label}s</p>
                                        <p className="text-xl font-bold text-[#3d3630]">{count}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                {/* User Table Card */}
                <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm overflow-hidden">
                    {/* Search and Filter Header */}
                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#e5e0d8]">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8279]" />
                            <Input
                                ref={searchInputRef}
                                placeholder="Search users by name, email... (press /)"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value)
                                    setCurrentPage(1)
                                }}
                                className="pl-9 bg-[#fdfcf9] border-[#e5e0d8] text-[#3d3630] placeholder:text-[#8a8279]/60"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Role filter chips */}
                            <div className="flex items-center gap-1.5">
                                {["ALL", "ADMIN", "DOCTOR", "PATIENT"].map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => { setRoleFilter(r); setCurrentPage(1) }}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                                            roleFilter === r
                                                ? "bg-[#3d3630] text-[#faf6f1] border-[#3d3630]"
                                                : "bg-[#fdfcf9] text-[#8a8279] border-[#e5e0d8] hover:border-[#c4a882]/40 hover:text-[#3d3630]"
                                        }`}
                                    >
                                        {r === "ALL" ? "All" : roleMeta[r].label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-[#e5e0d8] hover:bg-transparent">
                                    <TableHead className="text-[#8a8279] font-medium cursor-pointer select-none" onClick={() => handleSort("name")}>
                                        <span className="flex items-center gap-1">User {sortColumn === "name" && (sortDirection === "asc" ? "↑" : "↓")}</span>
                                    </TableHead>
                                    <TableHead className="text-[#8a8279] font-medium hidden md:table-cell cursor-pointer select-none" onClick={() => handleSort("email")}>
                                        <span className="flex items-center gap-1">Email {sortColumn === "email" && (sortDirection === "asc" ? "↑" : "↓")}</span>
                                    </TableHead>
                                    <TableHead className="text-[#8a8279] font-medium cursor-pointer select-none" onClick={() => handleSort("role")}>
                                        <span className="flex items-center gap-1">Role {sortColumn === "role" && (sortDirection === "asc" ? "↑" : "↓")}</span>
                                    </TableHead>
                                    <TableHead className="text-[#8a8279] font-medium hidden lg:table-cell cursor-pointer select-none" onClick={() => handleSort("createdAt")}>
                                        <span className="flex items-center gap-1">Created {sortColumn === "createdAt" && (sortDirection === "asc" ? "↑" : "↓")}</span>
                                    </TableHead>
                                    <TableHead className="text-[#8a8279] font-medium text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center text-[#8a8279]">
                                                <Users className="h-10 w-10 mb-3 opacity-40" />
                                                <p className="text-sm font-medium">
                                                    {users.length === 0 ? "No users found." : "No users match your filters."}
                                                </p>
                                                <p className="text-xs mt-1">
                                                    {users.length === 0 ? "Create your first user to get started." : "Try adjusting your search or filters."}
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedUsers.map((user) => {
                                        const meta = roleMeta[user.role]
                                        return (
                                            <TableRow key={user.id} className="border-[#e5e0d8]/60 hover:bg-[#f5f0eb]/50 transition-colors">
                                                <TableCell className="py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0e6c8]/60 font-medium text-[#8b7355]">
                                                            {(user.name || user.email)
                                                                .split(" ")
                                                                .map((n) => n[0])
                                                                .join("")
                                                                .slice(0, 2)
                                                                .toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-[#3d3630]">{user.name || "Unnamed User"}</p>
                                                            <p className="text-xs text-[#8a8279] md:hidden">{user.email}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell text-[#3d3630]">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm">{user.email}</span>
                                                        <CopyButton text={user.email} />
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`gap-1.5 text-xs font-medium ${meta.badge}`}>
                                                        <meta.icon className="size-3" />
                                                        {meta.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell text-[#8a8279]">
                                                    <span className="text-sm" title={new Date(user.createdAt).toLocaleString()}>
                                                        {timeAgo(user.createdAt)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {user.role === "ADMIN" ? (
                                                            <Badge variant="outline" className="border-[#e5e0d8] text-[#8a8279] bg-[#f5f0eb]/50 text-[10px]">
                                                                Protected
                                                            </Badge>
                                                        ) : (
                                                            <>
                                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)} className="text-[#8a8279] hover:text-[#3d3630] hover:bg-[#f0e6c8]/30">
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => openDeleteDialog(user)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-[#e5e0d8] p-4">
                            <p className="text-sm text-[#8a8279]">
                                Page {currentPage} of {totalPages} • {sortedUsers.length} users
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="border-[#e5e0d8] text-[#3d3630] hover:bg-[#f0e6c8]/30"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
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
                </Card>
            </div>

            {/* Edit User Dialog */}
            <Dialog open={!!editUserData} onOpenChange={(open) => !open && closeEditDialog()}>
                <DialogContent className="sm:max-w-md border-[#e5e0d8] bg-[#fdfcf9]">
                    <DialogHeader>
                        <DialogTitle className="text-[#3d3630]">Edit User</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <span className="text-sm font-medium text-[#3d3630]">Username</span>
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Enter username" className="border-[#e5e0d8] bg-[#fdfcf9]" />
                        </div>
                        <div className="grid gap-2">
                            <span className="text-sm font-medium text-[#3d3630]">Email</span>
                            <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Enter email" className="border-[#e5e0d8] bg-[#fdfcf9]" />
                        </div>
                        <div className="grid gap-2">
                            <span className="text-sm font-medium text-[#3d3630]">Role</span>
                            <Select value={editRole} onValueChange={(value) => setEditRole(value as "ADMIN" | "DOCTOR" | "PATIENT")}>
                                <SelectTrigger className="border-[#e5e0d8] bg-[#fdfcf9]">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PATIENT">Patient</SelectItem>
                                    <SelectItem value="DOCTOR">Doctor</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeEditDialog} disabled={editLoading} className="border-[#e5e0d8]">
                            Cancel
                        </Button>
                        <Button onClick={handleEditSubmit} disabled={editLoading} className="bg-[#8b7355] hover:bg-[#6b5a42] text-white">
                            {editLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete User Alert Dialog */}
            <AlertDialog open={!!deleteUserData} onOpenChange={(open) => !open && closeDeleteDialog()}>
                <AlertDialogContent className="border-[#e5e0d8] bg-[#fdfcf9]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-[#3d3630]">Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-[#8a8279]">
                            This will permanently delete <strong className="text-[#3d3630]">{deleteUserData?.name || deleteUserData?.email}</strong> from both the database and Clerk. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={closeDeleteDialog} disabled={deleteLoading} className="border-[#e5e0d8]">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleteLoading} className="bg-red-600 hover:bg-red-700 text-white">
                            {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
