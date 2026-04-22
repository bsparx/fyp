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
    <div className="peer/menu-button flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-[#f0e6c8]/50 hover:text-[#3d3630] focus-visible:ring-2 active:bg-[#f0e6c8]/50 active:text-[#3d3630] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!">
      <UserButton
        appearance={{
          elements: {
            avatarBox: "w-5 h-5 rounded-md",
            userButtonTrigger: "p-0 m-0 shadow-none focus:shadow-none flex items-center justify-center",
            userButtonPopoverCard: "bg-[#fdfcf9] border border-[#e5e0d8] shadow-lg",
            userPreviewMainIdentifier: "text-[#3d3630] font-medium",
            userPreviewSecondaryIdentifier: "text-[#8a8279] text-xs",
            userButtonPopoverActionButton: "text-[#3d3630] hover:bg-[#f0e6c8]/40",
            userButtonPopoverActionButtonText: "text-[#3d3630]",
            userButtonPopoverFooter: "hidden",
          },
        }}
      />
      <span className="truncate group-data-[collapsible=icon]:hidden">Account</span>
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
