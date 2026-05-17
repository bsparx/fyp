"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
    LayoutDashboard,
    Users,
    UserPlus,
    Database,
    Search,
    BarChart3,
    UploadCloud,
    FileText,
    Settings,
    Command,
} from "lucide-react"
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"

export function CommandPalette() {
    const [open, setOpen] = React.useState(false)
    const router = useRouter()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const runCommand = React.useCallback((cmd: () => void) => {
        setOpen(false)
        cmd()
    }, [])

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." className="text-[#1e2a3a] placeholder:text-[#6b7d99]/60" />
            <CommandList>
                <CommandEmpty className="text-[#6b7d99] py-6 text-center text-sm">No results found.</CommandEmpty>
                <CommandGroup heading="Navigation" className="text-[#6b7d99]">
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))} className="text-[#1e2a3a] cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4 text-[#5b7cfa]" />
                        Dashboard
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/users"))} className="text-[#1e2a3a] cursor-pointer">
                        <Users className="mr-2 h-4 w-4 text-[#38bdf8]" />
                        All Users
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/users/new"))} className="text-[#1e2a3a] cursor-pointer">
                        <UserPlus className="mr-2 h-4 w-4 text-[#4ade80]" />
                        Create User
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/users/data"))} className="text-[#1e2a3a] cursor-pointer">
                        <Database className="mr-2 h-4 w-4 text-[#8aa4f0]" />
                        User Data
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator className="bg-[#d0d9e8]" />
                <CommandGroup heading="Vector Database" className="text-[#6b7d99]">
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/upload"))} className="text-[#1e2a3a] cursor-pointer">
                        <UploadCloud className="mr-2 h-4 w-4 text-[#5b7cfa]" />
                        Upload Documents
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/database"))} className="text-[#1e2a3a] cursor-pointer">
                        <FileText className="mr-2 h-4 w-4 text-[#38bdf8]" />
                        Browse Entries
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/database/search"))} className="text-[#1e2a3a] cursor-pointer">
                        <Search className="mr-2 h-4 w-4 text-[#4ade80]" />
                        Search
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/database/stats"))} className="text-[#1e2a3a] cursor-pointer">
                        <BarChart3 className="mr-2 h-4 w-4 text-[#8aa4f0]" />
                        Statistics
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator className="bg-[#d0d9e8]" />
                <CommandGroup heading="Settings" className="text-[#6b7d99]">
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/settings"))} className="text-[#1e2a3a] cursor-pointer">
                        <Settings className="mr-2 h-4 w-4 text-[#6b7d99]" />
                        Settings
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    )
}
