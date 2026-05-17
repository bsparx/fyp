"use client"

import { useEffect, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Keyboard, Search, ArrowRight, Command, Home, Users, Database, Settings, HelpCircle } from "lucide-react"

const shortcuts = [
    { keys: ["?"], description: "Show keyboard shortcuts", icon: HelpCircle },
    { keys: ["⌘", "K"], description: "Open command palette", icon: Command },
    { keys: ["G", "D"], description: "Go to Dashboard", icon: Home },
    { keys: ["G", "U"], description: "Go to Users", icon: Users },
    { keys: ["G", "B"], description: "Go to Database", icon: Database },
    { keys: ["G", "S"], description: "Go to Settings", icon: Settings },
    { keys: ["/"], description: "Focus search", icon: Search },
]

export function KeyboardShortcutsDialog() {
    const [open, setOpen] = useState(false)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input/textarea
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

            if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
                e.preventDefault()
                setOpen((prev) => !prev)
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="border-[#d0d9e8] bg-[#ffffff] max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[#1e2a3a]">
                        <Keyboard className="size-5 text-[#5b7cfa]" />
                        Keyboard Shortcuts
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-1 mt-2">
                    {shortcuts.map((shortcut) => (
                        <div
                            key={shortcut.description}
                            className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#eef2f7] transition-colors"
                        >
                            <div className="flex items-center gap-2.5">
                                <shortcut.icon className="size-4 text-[#6b7d99]" />
                                <span className="text-sm text-[#1e2a3a]">{shortcut.description}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {shortcut.keys.map((key, i) => (
                                    <span key={i} className="flex items-center">
                                        <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md border border-[#d0d9e8] bg-[#eef2f7] text-[10px] font-mono font-medium text-[#1e2a3a]">
                                            {key}
                                        </kbd>
                                        {i < shortcut.keys.length - 1 && (
                                            <span className="mx-1 text-[#6b7d99]">+</span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
