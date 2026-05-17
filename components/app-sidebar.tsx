"use client"

import * as React from "react"
import {
  Stethoscope,
  LayoutDashboard,
  Users,
  Database,
  Settings,
  HelpCircle,
  Command,
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
      className="border-r border-sidebar-border"
      {...props}
    >
      <SidebarHeader className="px-4 py-4 group-data-[collapsible=icon]:px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <a href="/dashboard" className="flex items-center gap-3" aria-label="HMS Admin Dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                  <Stethoscope className="size-4" aria-hidden="true" />
                </div>
                <div className="flex flex-col text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold text-sidebar-foreground">
                    HMS Admin
                  </span>
                  <span className="truncate text-[11px] text-sidebar-foreground/60 font-medium tracking-wide uppercase">
                    Hospital Management
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2 group-data-[collapsible=icon]:px-1">
        <NavMain items={data.navMain} />
      </SidebarContent>

      <SidebarFooter className="px-2 py-3 group-data-[collapsible=icon]:px-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Help & Support"
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
            >
              <a href="/dashboard/settings">
                <Settings className="size-4" />
                <span className="text-sm group-data-[collapsible=icon]:hidden">Settings</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-3 py-2 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">
            <span>Command Menu</span>
            <kbd className="inline-flex items-center gap-1 rounded border border-sidebar-border bg-sidebar-accent px-1.5 py-0.5 font-mono text-[10px] text-sidebar-foreground/60">
              <Command className="size-2.5" />
              K
            </kbd>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-sidebar-border">
          <NavUser />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
