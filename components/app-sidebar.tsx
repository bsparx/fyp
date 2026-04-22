"use client"

import * as React from "react"
import {
  Stethoscope,
  LayoutDashboard,
  Users,
  Database,
  Settings,
  HelpCircle,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "User Management",
      url: "#",
      icon: Users,
      items: [
        {
          title: "All Users",
          url: "/dashboard/users",
        },
        {
          title: "Add User",
          url: "/dashboard/users/new",
        },
        {
          title: "User Data",
          url: "/dashboard/users/data",
        },
      ],
    },
    {
      title: "Vector Database",
      url: "#",
      icon: Database,
      items: [
        {
          title: "Upload Documents",
          url: "/dashboard/upload",
        },
        {
          title: "Browse Entries",
          url: "/dashboard/database",
        },
        {
          title: "Search",
          url: "/dashboard/database/search",
        },
        {
          title: "Statistics",
          url: "/dashboard/database/stats",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-[#e5e0d8] bg-[#f5f0eb]"
      {...props}
    >
      <SidebarHeader className="border-b border-[#e5e0d8] bg-[#f0e6c8]/40 px-4 py-4 group-data-[collapsible=icon]:px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="hover:bg-[#f0e6c8]/60 data-[state=open]:bg-[#f0e6c8]/60"
            >
              <a href="/dashboard" className="flex items-center gap-3">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#8b7355] text-[#faf6f1] shadow-sm group-data-[collapsible=icon]:hidden">
                  <Stethoscope className="size-4" />
                </div>
                <Stethoscope className="size-4 hidden text-[#8b7355] group-data-[collapsible=icon]:block" />
                <div className="flex flex-col text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold text-[#3d3630]">
                    HMS Admin
                  </span>
                  <span className="truncate text-[11px] text-[#8a8279] font-medium tracking-wide uppercase">
                    Hospital Management
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 group-data-[collapsible=icon]:px-0">
        <NavMain items={data.navMain} />
      </SidebarContent>

      <SidebarFooter className="border-t border-[#e5e0d8] bg-[#ede8e1]/50 px-2 py-3 group-data-[collapsible=icon]:px-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Help & Support"
              className="text-[#8a8279] hover:bg-[#f0e6c8]/50 hover:text-[#3d3630]"
            >
              <a href="#">
                <HelpCircle className="size-4" />
                <span className="text-sm group-data-[collapsible=icon]:hidden">Help & Support</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Settings"
              className="text-[#8a8279] hover:bg-[#f0e6c8]/50 hover:text-[#3d3630]"
            >
              <a href="/dashboard/settings">
                <Settings className="size-4" />
                <span className="text-sm group-data-[collapsible=icon]:hidden">Settings</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="mt-2 pt-2 border-t border-[#e5e0d8]/60">
          <NavUser />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
