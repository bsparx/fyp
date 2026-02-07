"use client"

import * as React from "react"
import {
  Hospital,
  LayoutDashboard,
  Users,
  Database,
  Settings,
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

// Hospital Management System data
const data = {
  user: {
    name: "Admin User",
    email: "admin@hospital.com",
    avatar: "/avatars/admin.jpg",
  },
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
        {
          title: "Roles & Permissions",
          url: "/dashboard/users/roles",
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
    {
      title: "Settings",
      url: "#",
      icon: Settings,
      items: [
        {
          title: "General",
          url: "/dashboard/settings",
        },

        {
          title: "System",
          url: "/dashboard/settings/system",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Hospital className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">HMS Admin</span>
                  <span className="truncate text-xs">Hospital Management</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
