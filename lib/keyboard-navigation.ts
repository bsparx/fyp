"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function useKeyboardNavigation() {
    const router = useRouter()

    useEffect(() => {
        let waitingForSecondKey = false
        let timeoutId: ReturnType<typeof setTimeout>

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input/textarea or if modifiers are pressed
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement ||
                e.metaKey ||
                e.ctrlKey ||
                e.altKey
            ) {
                return
            }

            if (e.key === "?") {
                // Let the shortcuts dialog handle this
                return
            }

            if (e.key.toLowerCase() === "g" && !waitingForSecondKey) {
                e.preventDefault()
                waitingForSecondKey = true
                timeoutId = setTimeout(() => {
                    waitingForSecondKey = false
                }, 1000)
                return
            }

            if (waitingForSecondKey) {
                clearTimeout(timeoutId)
                waitingForSecondKey = false
                const key = e.key.toLowerCase()
                const routes: Record<string, string> = {
                    d: "/dashboard",
                    u: "/dashboard/users",
                    b: "/dashboard/database",
                    s: "/dashboard/settings",
                    n: "/dashboard/users/new",
                    a: "/dashboard/users/data",
                    p: "/dashboard/database/search",
                }
                if (routes[key]) {
                    e.preventDefault()
                    router.push(routes[key])
                }
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [router])
}
