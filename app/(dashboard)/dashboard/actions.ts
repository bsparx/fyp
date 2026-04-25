"use server"

import prisma from "@/utils/db"

export interface DashboardStats {
    totalUsers: number
    totalDoctors: number
    totalPatients: number
    totalDocuments: number
    ingestedDocuments: number
    totalParentChunks: number
    totalRagChunks: number
    recentDocuments: {
        id: string
        title: string
        createdAt: Date
        isIngested: boolean
    }[]
    documentsPerDay: { date: string; count: number }[]
    userGrowth: { month: string; count: number }[]
}

export async function getDashboardStats(): Promise<DashboardStats> {
    const [
        totalUsers,
        totalDoctors,
        totalPatients,
        totalDocuments,
        ingestedDocuments,
        totalParentChunks,
        totalRagChunks,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: "DOCTOR" } }),
        prisma.user.count({ where: { role: "PATIENT" } }),
        prisma.document.count({ where: { type: "RAG" } }),
        prisma.document.count({ where: { type: "RAG", isIngested: true } }),
        prisma.parentChunk.count(),
        prisma.ragChunk.count(),
    ])

    // Recent documents (last 5 RAG docs)
    const recentDocuments = await prisma.document.findMany({
        select: { id: true, title: true, createdAt: true, isIngested: true },
        where: { type: "RAG" },
        orderBy: { createdAt: "desc" },
        take: 5,
    })

    // Documents per day (last 14 days)
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const docsPerDayRaw = await prisma.document.groupBy({
        by: ["createdAt"],
        _count: { id: true },
        where: {
            type: "RAG",
            createdAt: { gte: fourteenDaysAgo },
        },
        orderBy: { createdAt: "asc" },
    })

    const docsMap = new Map<string, number>()
    docsPerDayRaw.forEach((item) => {
        const date = item.createdAt.toISOString().split("T")[0]
        docsMap.set(date, (docsMap.get(date) || 0) + item._count.id)
    })

    // Fill in missing days
    const documentsPerDay: { date: string; count: number }[] = []
    for (let i = 13; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split("T")[0]
        documentsPerDay.push({ date: dateStr, count: docsMap.get(dateStr) || 0 })
    }

    // User growth by month (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)

    const usersRaw = await prisma.user.findMany({
        select: { createdAt: true },
        where: { createdAt: { gte: sixMonthsAgo } },
        orderBy: { createdAt: "asc" },
    })

    const userMap = new Map<string, number>()
    usersRaw.forEach((u) => {
        const month = u.createdAt.toISOString().slice(0, 7)
        userMap.set(month, (userMap.get(month) || 0) + 1)
    })

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const userGrowth: { month: string; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const monthKey = d.toISOString().slice(0, 7)
        const label = monthNames[d.getMonth()]
        userGrowth.push({ month: label, count: userMap.get(monthKey) || 0 })
    }

    return {
        totalUsers,
        totalDoctors,
        totalPatients,
        totalDocuments,
        ingestedDocuments,
        totalParentChunks,
        totalRagChunks,
        recentDocuments,
        documentsPerDay,
        userGrowth,
    }
}
