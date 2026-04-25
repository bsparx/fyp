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
            <CommandInput placeholder="Type a command or search..." className="text-[#3d3630] placeholder:text-[#8a8279]/60" />
            <CommandList>
                <CommandEmpty className="text-[#8a8279] py-6 text-center text-sm">No results found.</CommandEmpty>
                <CommandGroup heading="Navigation" className="text-[#8a8279]">
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))} className="text-[#3d3630] cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4 text-[#8b7355]" />
                        Dashboard
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/users"))} className="text-[#3d3630] cursor-pointer">
                        <Users className="mr-2 h-4 w-4 text-[#7a9eaf]" />
                        All Users
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/users/new"))} className="text-[#3d3630] cursor-pointer">
                        <UserPlus className="mr-2 h-4 w-4 text-[#8fa68e]" />
                        Create User
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/users/data"))} className="text-[#3d3630] cursor-pointer">
                        <Database className="mr-2 h-4 w-4 text-[#c49a6c]" />
                        User Data
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator className="bg-[#e5e0d8]" />
                <CommandGroup heading="Vector Database" className="text-[#8a8279]">
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/upload"))} className="text-[#3d3630] cursor-pointer">
                        <UploadCloud className="mr-2 h-4 w-4 text-[#8b7355]" />
                        Upload Documents
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/database"))} className="text-[#3d3630] cursor-pointer">
                        <FileText className="mr-2 h-4 w-4 text-[#7a9eaf]" />
                        Browse Entries
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/database/search"))} className="text-[#3d3630] cursor-pointer">
                        <Search className="mr-2 h-4 w-4 text-[#8fa68e]" />
                        Search
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/database/stats"))} className="text-[#3d3630] cursor-pointer">
                        <BarChart3 className="mr-2 h-4 w-4 text-[#c49a6c]" />
                        Statistics
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator className="bg-[#e5e0d8]" />
                <CommandGroup heading="Settings" className="text-[#8a8279]">
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/settings"))} className="text-[#3d3630] cursor-pointer">
                        <Settings className="mr-2 h-4 w-4 text-[#8a8279]" />
                        Settings
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    )
}
