"use client"

import { UserButton } from "@clerk/nextjs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useSidebar } from "@/components/ui/sidebar"

export function NavUser() {
  const { state, isMobile } = useSidebar()
  const isCollapsed = state === "collapsed"

  const button = (
    <div className="peer/menu-button flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:mx-auto">
      <UserButton
        appearance={{
          elements: {
            avatarBox: "w-5 h-5 rounded-md",
            userButtonTrigger: "p-0 m-0 shadow-none focus:shadow-none flex items-center justify-center w-full h-full",
            userButtonPopoverCard: "bg-sidebar border border-sidebar-border shadow-lg",
            userPreviewMainIdentifier: "text-sidebar-foreground font-medium",
            userPreviewSecondaryIdentifier: "text-sidebar-foreground/60 text-xs",
            userButtonPopoverActionButton: "text-sidebar-foreground hover:bg-sidebar-accent",
            userButtonPopoverActionButtonText: "text-sidebar-foreground",
            userButtonPopoverFooter: "hidden",
          },
        }}
      />
      <span className="truncate group-data-[collapsible=icon]:hidden text-sidebar-foreground">Account</span>
    </div>
  )

  if (isCollapsed && !isMobile) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" align="center">Account</TooltipContent>
      </Tooltip>
    )
  }

  return button
}
