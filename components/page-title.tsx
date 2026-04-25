"use client"

import { useEffect } from "react"

export function PageTitle({ title }: { title: string }) {
    useEffect(() => {
        const base = "HMS"
        document.title = `${title} | ${base}`
        return () => {
            document.title = base
        }
    }, [title])
    return null
}
