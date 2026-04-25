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
            <DialogContent className="border-[#e5e0d8] bg-[#fdfcf9] max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[#3d3630]">
                        <Keyboard className="size-5 text-[#8b7355]" />
                        Keyboard Shortcuts
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-1 mt-2">
                    {shortcuts.map((shortcut) => (
                        <div
                            key={shortcut.description}
                            className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#f5f0eb] transition-colors"
                        >
                            <div className="flex items-center gap-2.5">
                                <shortcut.icon className="size-4 text-[#8a8279]" />
                                <span className="text-sm text-[#3d3630]">{shortcut.description}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {shortcut.keys.map((key, i) => (
                                    <span key={i} className="flex items-center">
                                        <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md border border-[#e5e0d8] bg-[#f5f0eb] text-[10px] font-mono font-medium text-[#3d3630]">
                                            {key}
                                        </kbd>
                                        {i < shortcut.keys.length - 1 && (
                                            <span className="mx-1 text-[#8a8279]">+</span>
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
