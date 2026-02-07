"use client"

import { useState, useEffect, useRef, useTransition } from "react"
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
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    FileText,
    X,
    Loader2,
    UploadCloud,
    GripVertical,
    Image as ImageIcon,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    RefreshCw,
    Layers,
    ClipboardList,
    MessageSquare,
} from "lucide-react"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { uploadUserDocument, getMedicalReportDetails, PatientDataType } from "../../data/actions"

interface UserDocument {
    id: string
    title: string
    type: string
    patientDataType: 'REPORT' | 'COMMENT' | null
    createdAt: string
    content: string
    isIngested: boolean
}

interface DocumentDetails {
    parentChunks: number
    childChunks: number
    files: Array<{ name: string; type: string }>
}

interface MedicalReportDetails {
    id: string
    documentId: string
    hospitalName: string | null
    reportDate: string | null
    createdAt: string
    values: Array<{
        id: string
        key: string
        value: string
        unit: string | null
    }>
}

interface FileItem {
    id: string
    file: File
    progress: number
    base64?: string
    fileType: 'pdf' | 'image'
}

function SortableFileItem({
    item,
    onRemove,
    isPending
}: {
    item: FileItem
    onRemove: (id: string) => void
    isPending: boolean
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-600 ${isDragging ? 'shadow-lg dark:shadow-slate-900/50' : ''}`}
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                disabled={isPending}
            >
                <GripVertical size={20} />
            </button>
            {item.fileType === 'pdf' ? (
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
            ) : (
                <ImageIcon className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 dark:text-slate-100 truncate text-sm">
                    {item.file.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {(item.file.size / 1024 / 1024).toFixed(2)} MB • {item.fileType.toUpperCase()}
                </p>
            </div>
            {item.progress < 100 && (
                <div className="w-16">
                    <Progress value={item.progress} className="h-1.5 dark:bg-slate-700" />
                </div>
            )}
            <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors"
                disabled={isPending}
            >
                <X size={16} />
            </button>
        </div>
    )
}

export default function UserDataPage({ params }: { params: Promise<{ id: string }> }) {
    const [userId, setUserId] = useState<string>("")
    const [userName, setUserName] = useState<string>("")
    const [files, setFiles] = useState<FileItem[]>([])
    const [isPending, startTransition] = useTransition()
    const [isProcessing, setIsProcessing] = useState(false)
    const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null)
    const [documentTitle, setDocumentTitle] = useState("")
    const [dataType, setDataType] = useState<PatientDataType>("COMMENT")
    const [userDocuments, setUserDocuments] = useState<UserDocument[]>([])
    const [isLoadingDocs, setIsLoadingDocs] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [showUploadForm, setShowUploadForm] = useState(false)
    const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(null)
    const [documentDetails, setDocumentDetails] = useState<DocumentDetails | null>(null)
    const [medicalReportDetails, setMedicalReportDetails] = useState<MedicalReportDetails | null>(null)
    const [isLoadingDetails, setIsLoadingDetails] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    useEffect(() => {
        const initPage = async () => {
            const resolvedParams = await params
            const id = resolvedParams.id
            setUserId(id)
            fetchUserDocuments(id)
            fetchUserName(id)
        }
        initPage()
    }, [params])

    const fetchUserName = async (id: string) => {
        try {
            const response = await fetch("/api/users")
            const data = await response.json()
            if (response.ok) {
                const user = data.users.find((u: { id: string; name: string | null; email: string }) => u.id === id)
                if (user) {
                    setUserName(user.name || user.email)
                }
            }
        } catch (error) {
            console.error("Error fetching user name:", error)
        }
    }

    const fetchUserDocuments = async (id: string, page: number = 1) => {
        setIsLoadingDocs(true)
        try {
            const response = await fetch(`/api/users/${id}/documents?page=${page}`)
            const data = await response.json()
            if (response.ok) {
                setUserDocuments(data.documents)
                setTotalPages(data.totalPages || 1)
            }
        } catch (error) {
            console.error("Error fetching user documents:", error)
        } finally {
            setIsLoadingDocs(false)
        }
    }

    const fetchDocumentDetails = async (documentId: string) => {
        setIsLoadingDetails(true)
        setMedicalReportDetails(null)
        setDocumentDetails(null)

        const doc = userDocuments.find(d => d.id === documentId)
        setSelectedDocument(doc || null)

        try {
            if (doc?.patientDataType === 'REPORT') {
                // Fetch medical report details
                const reportDetails = await getMedicalReportDetails(documentId)
                if (reportDetails) {
                    setMedicalReportDetails(reportDetails)
                }
            } else {
                // Fetch comment/embedding details
                const response = await fetch(`/api/documents/${documentId}/details`)
                const data = await response.json()
                if (response.ok) {
                    setDocumentDetails(data)
                }
            }
        } catch (error) {
            console.error("Error fetching document details:", error)
        } finally {
            setIsLoadingDetails(false)
        }
    }

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => {
                const result = reader.result as string
                const base64 = result.split(',')[1]
                resolve(base64)
            }
            reader.onerror = (error) => reject(error)
        })
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []) as File[]
        const validFiles = files.filter(file => {
            const isPdf = file.type === 'application/pdf'
            const isImage = file.type.startsWith('image/')
            return isPdf || isImage
        })

        if (validFiles.length !== files.length) {
            setMessage({ error: true, text: "Some files were skipped. Only PDF and image files are allowed." })
        }

        const remainingSlots = 5 - files.length

        if (remainingSlots <= 0) {
            setMessage({ error: true, text: "Maximum of 5 files already reached." })
            return
        }

        const filesToAdd = validFiles.slice(0, remainingSlots)

        if (validFiles.length > remainingSlots) {
            setMessage({ error: true, text: `Only the first ${remainingSlots} file(s) were added. Maximum is 5 files total.` })
        }

        const newFileItems: FileItem[] = filesToAdd.map((file) => ({
            id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            progress: 0,
            fileType: file.type === 'application/pdf' ? 'pdf' : 'image',
        }))

        setFiles(prev => [...prev, ...newFileItems])

        for (const item of newFileItems) {
            let progress = 0
            const interval = setInterval(() => {
                progress += 10
                if (progress <= 90) {
                    setFiles(prev =>
                        prev.map(f => f.id === item.id ? { ...f, progress } : f)
                    )
                }
            }, 50)

            try {
                const base64 = await fileToBase64(item.file)
                clearInterval(interval)
                setFiles(prev =>
                    prev.map(f => f.id === item.id ? { ...f, progress: 100, base64 } : f)
                )
            } catch (error) {
                clearInterval(interval)
                console.error("Error converting file to base64:", error)
                setFiles(prev => prev.filter(f => f.id !== item.id))
                setMessage({ error: true, text: `Failed to process ${item.file.name}` })
            }
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleRemoveFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id))
        setMessage(null)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            setFiles((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id)
                const newIndex = items.findIndex(item => item.id === over.id)
                return arrayMove(items, oldIndex, newIndex)
            })
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!userId) {
            setMessage({ error: true, text: "User ID is required." })
            return
        }

        if (files.length === 0) {
            setMessage({ error: true, text: "Please select at least one file." })
            return
        }

        if (!documentTitle.trim()) {
            setMessage({ error: true, text: "Please enter a document title." })
            return
        }

        const allProcessed = files.every(f => f.base64 && f.progress === 100)
        if (!allProcessed) {
            setMessage({ error: true, text: "Please wait for all files to finish processing." })
            return
        }

        setIsProcessing(true)
        setMessage(null)

        startTransition(async () => {
            try {
                const formData = new FormData()
                formData.set("title", documentTitle.trim())
                formData.set("userId", userId)
                formData.set("dataType", dataType)

                const filesData = files.map(f => ({
                    base64: f.base64!,
                    type: f.fileType,
                    name: f.file.name,
                }))
                formData.set("files", JSON.stringify(filesData))

                const result = await uploadUserDocument(formData)

                if (result.success) {
                    setMessage({ error: false, text: result.message })
                    setFiles([])
                    setDocumentTitle("")
                    setDataType("COMMENT")
                    setShowUploadForm(false)
                    fetchUserDocuments(userId, 1)
                    setCurrentPage(1)
                } else {
                    setMessage({ error: true, text: result.message })
                }
            } catch (error) {
                console.error("Error uploading document:", error)
                setMessage({ error: true, text: "An unexpected error occurred. Please try again." })
            } finally {
                setIsProcessing(false)
            }
        })
    }

    const isLoading = isPending || isProcessing

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
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/dashboard/users">User Management</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/dashboard/users/data">User Data</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                                <BreadcrumbPage>{userName || "User"}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </header>

            <div className="flex flex-1 flex-col gap-6 p-6 pt-0">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">User Documents</h1>
                        <p className="text-muted-foreground mt-1">
                            Managing documents for {userName || "User"}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => fetchUserDocuments(userId, currentPage)} disabled={isLoadingDocs}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingDocs ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                        <Button onClick={() => setShowUploadForm(!showUploadForm)}>
                            <UploadCloud className="h-4 w-4 mr-2" />
                            {showUploadForm ? "Cancel" : "Add Documents"}
                        </Button>
                    </div>
                </div>

                {/* Upload Form */}
                {showUploadForm && (
                    <div className="rounded-xl border bg-card shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-4">Upload New Documents</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Data Type Selector */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                                    Data Type
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setDataType("REPORT")}
                                        disabled={isLoading}
                                        className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${dataType === "REPORT"
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-400"
                                            : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
                                            }`}
                                    >
                                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${dataType === "REPORT"
                                            ? "bg-blue-100 dark:bg-blue-500/20"
                                            : "bg-slate-100 dark:bg-slate-800"
                                            }`}>
                                            <ClipboardList className={`h-5 w-5 ${dataType === "REPORT"
                                                ? "text-blue-600 dark:text-blue-400"
                                                : "text-slate-500 dark:text-slate-400"
                                                }`} />
                                        </div>
                                        <div className="text-left">
                                            <p className={`font-medium ${dataType === "REPORT"
                                                ? "text-blue-700 dark:text-blue-300"
                                                : "text-slate-700 dark:text-slate-200"
                                                }`}>
                                                Medical Report
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Extract key-value pairs (lab tests, vitals)
                                            </p>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDataType("COMMENT")}
                                        disabled={isLoading}
                                        className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${dataType === "COMMENT"
                                            ? "border-green-500 bg-green-50 dark:bg-green-500/10 dark:border-green-400"
                                            : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
                                            }`}
                                    >
                                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${dataType === "COMMENT"
                                            ? "bg-green-100 dark:bg-green-500/20"
                                            : "bg-slate-100 dark:bg-slate-800"
                                            }`}>
                                            <MessageSquare className={`h-5 w-5 ${dataType === "COMMENT"
                                                ? "text-green-600 dark:text-green-400"
                                                : "text-slate-500 dark:text-slate-400"
                                                }`} />
                                        </div>
                                        <div className="text-left">
                                            <p className={`font-medium ${dataType === "COMMENT"
                                                ? "text-green-700 dark:text-green-300"
                                                : "text-slate-700 dark:text-slate-200"
                                                }`}>
                                                Comments / Notes
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Semantic embedding for AI search
                                            </p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Document Title */}
                            <div className="space-y-2">
                                <label
                                    htmlFor="documentTitle"
                                    className="block text-sm font-medium text-slate-700 dark:text-slate-200"
                                >
                                    Document Title
                                </label>
                                <Input
                                    id="documentTitle"
                                    value={documentTitle}
                                    onChange={(e) => setDocumentTitle(e.target.value)}
                                    placeholder="Enter a descriptive title..."
                                    disabled={isLoading}
                                />
                            </div>

                            {/* File Upload */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label
                                        htmlFor="fileInput"
                                        className="block text-sm font-medium text-slate-700 dark:text-slate-200"
                                    >
                                        Upload Files (PDF & Images, up to 5)
                                    </label>
                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                        {files.length}/5 files
                                    </span>
                                </div>

                                <input
                                    type="file"
                                    id="fileInput"
                                    name="fileInput"
                                    accept=".pdf,application/pdf,image/*"
                                    multiple={true}
                                    className="hidden"
                                    onChange={handleFileChange}
                                    ref={fileInputRef}
                                    disabled={isLoading || files.length >= 5}
                                />

                                {files.length < 5 && (
                                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50/50 dark:bg-slate-800/30 transition-colors duration-200">
                                        <div className="space-y-3">
                                            <div className="mx-auto w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                                <UploadCloud className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                                    Drag and drop your files here, or
                                                </p>
                                                <label
                                                    htmlFor="fileInput"
                                                    className="mt-2 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white text-sm rounded-lg cursor-pointer transition-colors duration-200"
                                                >
                                                    Browse files
                                                </label>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                PDF and image files only, up to 10MB each • {5 - files.length} slot(s) remaining
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {files.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                            <GripVertical size={14} className="text-slate-400 dark:text-slate-500" />
                                            Drag to reorder • Files will be processed in this order
                                        </p>
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <SortableContext
                                                items={files.map(f => f.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                <div className="space-y-2">
                                                    {files.map((item, index) => (
                                                        <div key={item.id} className="relative">
                                                            <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
                                                                {index + 1}
                                                            </span>
                                                            <SortableFileItem
                                                                item={item}
                                                                onRemove={handleRemoveFile}
                                                                isPending={isLoading}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </SortableContext>
                                        </DndContext>
                                    </div>
                                )}

                                {files.length >= 5 && (
                                    <p className="text-amber-600 dark:text-amber-400 text-sm flex items-center gap-1.5">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400"></span>
                                        Maximum of 5 files reached
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    type="submit"
                                    disabled={isLoading || files.length === 0 || !documentTitle.trim()}
                                    className="flex-1"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center">
                                            <Loader2 className="animate-spin mr-2 h-5 w-5" />
                                            Processing...
                                        </span>
                                    ) : (
                                        "Upload Documents"
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowUploadForm(false)
                                        setFiles([])
                                        setDocumentTitle("")
                                        setDataType("COMMENT")
                                        setMessage(null)
                                    }}
                                    disabled={isLoading}
                                >
                                    Cancel
                                </Button>
                            </div>

                            {message && (
                                <div
                                    className={`p-4 rounded-lg border ${message.error
                                        ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300"
                                        : "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-800 dark:text-green-300"
                                        } flex items-start`}
                                >
                                    <div className={`rounded-full w-6 h-6 mr-3 shrink-0 flex items-center justify-center text-sm font-bold ${message.error
                                        ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                                        : "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                                        }`}>
                                        {message.error ? "!" : "✓"}
                                    </div>
                                    <div>
                                        <p className="font-medium">{message.error ? "Error" : "Success"}</p>
                                        <p className="text-sm opacity-90">{message.text}</p>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                )}

                {/* User Documents List */}
                <div className="rounded-xl border bg-card shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4">Documents ({userDocuments.length})</h2>
                    {isLoadingDocs ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : userDocuments.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No documents found for this user</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {userDocuments.map((doc) => (
                                <div
                                    key={doc.id}
                                    onClick={() => fetchDocumentDetails(doc.id)}
                                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer hover:border-primary/50 transition-colors"
                                >
                                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${doc.patientDataType === 'REPORT'
                                        ? "bg-blue-100 dark:bg-blue-500/20"
                                        : "bg-green-100 dark:bg-green-500/20"
                                        }`}>
                                        {doc.patientDataType === 'REPORT' ? (
                                            <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        ) : (
                                            <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{doc.title}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${doc.patientDataType === 'REPORT'
                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                                                : "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                                                }`}>
                                                {doc.patientDataType === 'REPORT' ? 'Report' : 'Comment'}
                                            </span>
                                            <span>
                                                {new Date(doc.createdAt).toLocaleDateString("en-US", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </span>
                                            {doc.isIngested && (
                                                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                                                    <Layers className="h-3 w-3" />
                                                    {doc.patientDataType === 'REPORT' ? 'Processed' : 'Embedded'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Page {currentPage} of {totalPages}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Document Details Dialog */}
                <Dialog open={selectedDocument !== null} onOpenChange={(open) => !open && setSelectedDocument(null)}>
                    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {selectedDocument?.patientDataType === 'REPORT' ? 'Medical Report Details' : 'Document Details'}
                            </DialogTitle>
                            <DialogDescription>
                                {selectedDocument?.patientDataType === 'REPORT'
                                    ? 'View extracted test values and report information.'
                                    : 'View detailed information about this document processing and chunks.'}
                            </DialogDescription>
                        </DialogHeader>
                        {isLoadingDetails ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : selectedDocument?.patientDataType === 'REPORT' && medicalReportDetails ? (
                            /* Medical Report Details View */
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Report Information</h3>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                            <p className="text-sm text-muted-foreground">Document Title</p>
                                            <p className="font-medium mt-1">{selectedDocument?.title ?? "-"}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                            <p className="text-sm text-muted-foreground">Hospital / Lab</p>
                                            <p className="font-medium mt-1">{medicalReportDetails.hospitalName ?? "Not detected"}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                            <p className="text-sm text-muted-foreground">Report Date</p>
                                            <p className="font-medium mt-1">
                                                {medicalReportDetails.reportDate
                                                    ? new Date(medicalReportDetails.reportDate).toLocaleDateString("en-US", {
                                                        year: "numeric",
                                                        month: "long",
                                                        day: "numeric",
                                                    })
                                                    : "Not detected"}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                            <p className="text-sm text-muted-foreground">Uploaded</p>
                                            <p className="font-medium mt-1">
                                                {selectedDocument ? new Date(selectedDocument.createdAt).toLocaleString() : "-"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">
                                        Extracted Test Values ({medicalReportDetails.values.length})
                                    </h3>
                                    {medicalReportDetails.values.length > 0 ? (
                                        <div className="border rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-100 dark:bg-slate-800">
                                                    <tr>
                                                        <th className="text-left p-3 font-medium">Test Name</th>
                                                        <th className="text-right p-3 font-medium">Value</th>
                                                        <th className="text-left p-3 font-medium">Unit</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                    {medicalReportDetails.values.map((val) => (
                                                        <tr key={val.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                            <td className="p-3 font-medium">{val.key}</td>
                                                            <td className="p-3 text-right tabular-nums">{val.value}</td>
                                                            <td className="p-3 text-muted-foreground">{val.unit ?? "-"}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-50" />
                                            <p>No test values were extracted from this report.</p>
                                            <p className="text-sm mt-1">The report may not contain recognized test formats.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : documentDetails ? (
                            /* Comment/Embedding Details View */
                            <div className="space-y-6">
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold">Document Information</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Title:</span>
                                                <span className="font-medium">{selectedDocument?.title ?? "-"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Created:</span>
                                                <span className="font-medium">
                                                    {selectedDocument ? new Date(selectedDocument.createdAt).toLocaleString() : "-"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Status:</span>
                                                <span className={`font-medium ${selectedDocument?.isIngested ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                                                    {selectedDocument?.isIngested ? "Embedded" : "Processing"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Chunk Statistics</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                                                    <Layers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Parent Chunks</p>
                                                    <p className="text-2xl font-bold">{documentDetails.parentChunks}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Child Chunks</p>
                                                    <p className="text-2xl font-bold">{documentDetails.childChunks}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Files</h3>
                                    <div className="space-y-2">
                                        {documentDetails.files.map((file, index) => (
                                            <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-600">
                                                {file.type === 'pdf' ? (
                                                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                                                ) : (
                                                    <ImageIcon className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">{file.name}</p>
                                                    <p className="text-xs text-muted-foreground uppercase">{file.type}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No details available for this document.</p>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Back Button */}
                <div className="flex justify-center">
                    <Link href="/dashboard/users/data">
                        <Button variant="outline" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back to User Data
                        </Button>
                    </Link>
                </div>
            </div>
        </>
    )
}
