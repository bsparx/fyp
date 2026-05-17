import { SearchClient } from "./search-client";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Hybrid Search | HMS",
}

export default function SearchPage() {
    return (
        <>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b border-[#d0d9e8] bg-[#ffffff]">
                <div className="flex items-center gap-2 px-6">
                    <SidebarTrigger aria-label="Toggle sidebar" className="-ml-1 text-[#6b7d99] hover:text-[#1e2a3a] hover:bg-[#dbe4f5]/40" />
                    <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 bg-[#d0d9e8]" />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="/dashboard" className="text-[#6b7d99] hover:text-[#1e2a3a]">Dashboard</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block text-[#d0d9e8]" />
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-[#1e2a3a] font-medium">Hybrid Search</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </header>
            <div className="flex flex-1 flex-col gap-6 p-6 pt-4 bg-[#eef2f7]">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[#1e2a3a]">Hybrid Search</h1>
                        <p className="text-[#6b7d99] text-sm mt-1">
                            Search vector data and private graph context from ingested reports
                        </p>
                    </div>
                </div>
                <SearchClient />
            </div>
        </>
    );
}
