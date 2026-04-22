"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:p-0">
      <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8279] px-3 mb-1">
        Platform
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) =>
          item.items && item.items.length > 0 ? (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className="text-[#3d3630] hover:bg-[#f0e6c8]/40 hover:text-[#3d3630] data-[active=true]:bg-[#f0e6c8]/50 data-[active=true]:text-[#3d3630] data-[active=true]:font-medium rounded-lg transition-colors"
                  >
                    {item.icon && <item.icon className="size-4 text-[#8b7355]" />}
                    <span className="text-sm group-data-[collapsible=icon]:hidden">{item.title}</span>
                    <ChevronRight className="ml-auto size-4 text-[#8a8279] transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="border-l border-[#e5e0d8] ml-4 pl-2 pr-0">
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          className="text-[#8a8279] hover:bg-[#f0e6c8]/30 hover:text-[#3d3630] rounded-md text-[13px] transition-colors"
                        >
                          <a href={subItem.url}>
                            <span>{subItem.title}</span>
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                asChild
                isActive={item.isActive}
                className="text-[#3d3630] hover:bg-[#f0e6c8]/40 hover:text-[#3d3630] data-[active=true]:bg-[#f0e6c8]/50 data-[active=true]:text-[#3d3630] data-[active=true]:font-medium rounded-lg transition-colors"
              >
                <a href={item.url}>
                  {item.icon && <item.icon className="size-4 text-[#8b7355]" />}
                  <span className="text-sm group-data-[collapsible=icon]:hidden">{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
