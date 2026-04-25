import { AppSidebar } from "@/components/app-sidebar"
import { CommandPalette } from "@/components/command-palette"
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts"
import { KeyboardNavigationProvider } from "@/components/keyboard-navigation-provider"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                {children}
            </SidebarInset>
            <CommandPalette />
            <KeyboardNavigationProvider />
            <KeyboardShortcutsDialog />
            <Toaster position="bottom-right" richColors closeButton />
        </SidebarProvider>
    )
}
