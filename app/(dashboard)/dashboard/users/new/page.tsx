"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    ArrowLeft,
    Eye,
    EyeOff,
    RefreshCw,
    Copy,
    Check,
    User,
    Mail,
    Lock,
    Shield,
} from "lucide-react"

function generateStrongPassword(length: number = 16): string {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const lowercase = "abcdefghijklmnopqrstuvwxyz"
    const numbers = "0123456789"
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?"

    const allChars = uppercase + lowercase + numbers + symbols

    // Ensure at least one of each type
    let password = ""
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += symbols[Math.floor(Math.random() * symbols.length)]

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)]
    }

    // Shuffle the password
    return password
        .split("")
        .sort(() => Math.random() - 0.5)
        .join("")
}

type Role = "DOCTOR" | "PATIENT"

export default function NewUserPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [copied, setCopied] = useState(false)
    const [apiError, setApiError] = useState("")

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        role: "" as Role | "",
    })

    const [errors, setErrors] = useState({
        username: "",
        email: "",
        password: "",
        role: "",
    })

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
        setErrors((prev) => ({ ...prev, [name]: "" }))
        setApiError("")
    }

    const handleRoleChange = (value: Role) => {
        setFormData((prev) => ({ ...prev, role: value }))
        setErrors((prev) => ({ ...prev, role: "" }))
        setApiError("")
    }

    const handleGeneratePassword = () => {
        const newPassword = generateStrongPassword(16)
        setFormData((prev) => ({ ...prev, password: newPassword }))
        setErrors((prev) => ({ ...prev, password: "" }))
        setShowPassword(true)
    }

    const handleCopyPassword = async () => {
        await navigator.clipboard.writeText(formData.password)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const validateForm = () => {
        const newErrors = {
            username: "",
            email: "",
            password: "",
            role: "",
        }

        if (!formData.username.trim()) {
            newErrors.username = "Username is required"
        } else if (formData.username.length < 3) {
            newErrors.username = "Username must be at least 3 characters"
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email is required"
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Please enter a valid email address"
        }

        if (!formData.password) {
            newErrors.password = "Password is required"
        } else if (formData.password.length < 8) {
            newErrors.password = "Password must be at least 8 characters"
        }

        if (!formData.role) {
            newErrors.role = "Please select a role"
        }

        setErrors(newErrors)
        return !newErrors.username && !newErrors.email && !newErrors.password && !newErrors.role
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) return

        setIsLoading(true)
        setApiError("")

        try {
            const response = await fetch("/api/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    role: formData.role,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                setApiError(data.error || "Failed to create user")
                return
            }

            // Redirect to users list on success
            router.push("/dashboard/users")
        } catch (error) {
            console.error("Error creating user:", error)
            setApiError("An unexpected error occurred. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    const getPasswordStrength = (password: string) => {
        if (!password) return { strength: 0, label: "", color: "" }

        let strength = 0
        if (password.length >= 8) strength++
        if (password.length >= 12) strength++
        if (/[A-Z]/.test(password)) strength++
        if (/[a-z]/.test(password)) strength++
        if (/[0-9]/.test(password)) strength++
        if (/[^A-Za-z0-9]/.test(password)) strength++

        if (strength <= 2) return { strength: 1, label: "Weak", color: "bg-red-500" }
        if (strength <= 4) return { strength: 2, label: "Medium", color: "bg-yellow-500" }
        return { strength: 3, label: "Strong", color: "bg-green-500" }
    }

    const passwordStrength = getPasswordStrength(formData.password)

    return (
        <>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4"
                    />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="/dashboard/users">Users</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Create User</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </header>

            <div className="flex flex-1 flex-col gap-6 p-6 pt-0">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/users">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Create New User</h1>
                        <p className="text-muted-foreground mt-1">
                            Add a new user to your hospital management system.
                        </p>
                    </div>
                </div>

                <div className="max-w-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* API Error Alert */}
                        {apiError && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                                {apiError}
                            </div>
                        )}

                        <div className="rounded-xl border bg-card p-6 shadow-sm">
                            <h2 className="text-lg font-semibold mb-4">User Information</h2>

                            <div className="space-y-4">
                                {/* Username Field */}
                                <div className="space-y-2">
                                    <label htmlFor="username" className="text-sm font-medium">
                                        Username
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="username"
                                            name="username"
                                            placeholder="Enter username"
                                            value={formData.username}
                                            onChange={handleInputChange}
                                            className={`pl-9 ${errors.username ? "border-red-500" : ""}`}
                                        />
                                    </div>
                                    {errors.username && (
                                        <p className="text-sm text-red-500">{errors.username}</p>
                                    )}
                                </div>

                                {/* Email Field */}
                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-medium">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="Enter email address"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className={`pl-9 ${errors.email ? "border-red-500" : ""}`}
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="text-sm text-red-500">{errors.email}</p>
                                    )}
                                </div>

                                {/* Role Field */}
                                <div className="space-y-2">
                                    <label htmlFor="role" className="text-sm font-medium">
                                        Role
                                    </label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
                                        <Select value={formData.role} onValueChange={handleRoleChange}>
                                            <SelectTrigger className={`pl-9 ${errors.role ? "border-red-500" : ""}`}>
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="DOCTOR">
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
                                                        Doctor
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="PATIENT">
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
                                                        Patient
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {errors.role && (
                                        <p className="text-sm text-red-500">{errors.role}</p>
                                    )}
                                </div>

                                {/* Password Field */}
                                <div className="space-y-2">
                                    <label htmlFor="password" className="text-sm font-medium">
                                        Password
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                id="password"
                                                name="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Enter password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                className={`pl-9 pr-20 ${errors.password ? "border-red-500" : ""}`}
                                            />
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                {formData.password && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={handleCopyPassword}
                                                    >
                                                        {copied ? (
                                                            <Check className="h-3.5 w-3.5 text-green-500" />
                                                        ) : (
                                                            <Copy className="h-3.5 w-3.5" />
                                                        )}
                                                    </Button>
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? (
                                                        <EyeOff className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <Eye className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleGeneratePassword}
                                            className="gap-2 shrink-0"
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                            Generate
                                        </Button>
                                    </div>
                                    {errors.password && (
                                        <p className="text-sm text-red-500">{errors.password}</p>
                                    )}

                                    {/* Password Strength Indicator */}
                                    {formData.password && (
                                        <div className="space-y-2">
                                            <div className="flex gap-1">
                                                {[1, 2, 3].map((level) => (
                                                    <div
                                                        key={level}
                                                        className={`h-1.5 flex-1 rounded-full transition-colors ${level <= passwordStrength.strength
                                                                ? passwordStrength.color
                                                                : "bg-muted"
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Password strength: <span className="font-medium">{passwordStrength.label}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="rounded-xl border bg-muted/50 p-4">
                            <h3 className="font-medium text-sm mb-2">Password Requirements</h3>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li className={formData.password.length >= 8 ? "text-green-600" : ""}>
                                    • At least 8 characters long
                                </li>
                                <li className={/[A-Z]/.test(formData.password) ? "text-green-600" : ""}>
                                    • Contains uppercase letter
                                </li>
                                <li className={/[a-z]/.test(formData.password) ? "text-green-600" : ""}>
                                    • Contains lowercase letter
                                </li>
                                <li className={/[0-9]/.test(formData.password) ? "text-green-600" : ""}>
                                    • Contains number
                                </li>
                                <li className={/[^A-Za-z0-9]/.test(formData.password) ? "text-green-600" : ""}>
                                    • Contains special character
                                </li>
                            </ul>
                        </div>

                        {/* Form Actions */}
                        <div className="flex items-center gap-4">
                            <Button type="submit" disabled={isLoading} className="min-w-32">
                                {isLoading ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    "Create User"
                                )}
                            </Button>
                            <Link href="/dashboard/users">
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </>
    )
}
