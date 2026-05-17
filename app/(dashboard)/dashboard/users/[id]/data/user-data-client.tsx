"use client"

import dynamic from "next/dynamic";
import { useState, useActionState } from "react"
import Link from "next/link"
import { toast } from "sonner"
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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
const Sheet = dynamic(() => import("@/components/ui/sheet").then(mod => mod.Sheet), { ssr: false });
const SheetContent = dynamic(() => import("@/components/ui/sheet").then(mod => mod.SheetContent), { ssr: false });
const SheetDescription = dynamic(() => import("@/components/ui/sheet").then(mod => mod.SheetDescription), { ssr: false });
const SheetHeader = dynamic(() => import("@/components/ui/sheet").then(mod => mod.SheetHeader), { ssr: false });
const SheetTitle = dynamic(() => import("@/components/ui/sheet").then(mod => mod.SheetTitle), { ssr: false });
const AlertDialog = dynamic(() => import("@/components/ui/alert-dialog").then(mod => mod.AlertDialog), { ssr: false });
const AlertDialogAction = dynamic(() => import("@/components/ui/alert-dialog").then(mod => mod.AlertDialogAction), { ssr: false });
const AlertDialogCancel = dynamic(() => import("@/components/ui/alert-dialog").then(mod => mod.AlertDialogCancel), { ssr: false });
const AlertDialogContent = dynamic(() => import("@/components/ui/alert-dialog").then(mod => mod.AlertDialogContent), { ssr: false });
const AlertDialogDescription = dynamic(() => import("@/components/ui/alert-dialog").then(mod => mod.AlertDialogDescription), { ssr: false });
const AlertDialogFooter = dynamic(() => import("@/components/ui/alert-dialog").then(mod => mod.AlertDialogFooter), { ssr: false });
const AlertDialogHeader = dynamic(() => import("@/components/ui/alert-dialog").then(mod => mod.AlertDialogHeader), { ssr: false });
const AlertDialogTitle = dynamic(() => import("@/components/ui/alert-dialog").then(mod => mod.AlertDialogTitle), { ssr: false });
const Dialog = dynamic(() => import("@/components/ui/dialog").then(mod => mod.Dialog), { ssr: false });
const DialogContent = dynamic(() => import("@/components/ui/dialog").then(mod => mod.DialogContent), { ssr: false });
const DialogDescription = dynamic(() => import("@/components/ui/dialog").then(mod => mod.DialogDescription), { ssr: false });
const DialogFooter = dynamic(() => import("@/components/ui/dialog").then(mod => mod.DialogFooter), { ssr: false });
const DialogHeader = dynamic(() => import("@/components/ui/dialog").then(mod => mod.DialogHeader), { ssr: false });
const DialogTitle = dynamic(() => import("@/components/ui/dialog").then(mod => mod.DialogTitle), { ssr: false });
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
    ExternalLink,
    Trash2,
    Stethoscope,
    HeartPulse,
    CheckCircle2,
    AlertCircle,
    Activity,
    BarChart3,
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
import {
    uploadUserDocument,
    getMedicalReportDetails,
    getDocumentDetails,
    getDocumentKnowledgeGraph,
    getUserAverageFidelitySummary,
    getUserDocuments,
    deleteDocument,
    deleteAllDocuments,
    PatientDataType,
    UploadUserDocumentResult,
} from "../../data/actions"

interface UserDocument {
    id: string
    title: string
    type: string
    patientDataType: 'REPORT' | 'COMMENT' | null
    createdAt: string
    isIngested: boolean
}

interface DocumentDetails {
    parentChunks: number
    childChunks: number
    files: Array<{ name: string; type: string; url: string }>
    reportURL: string | null
    hospitalName: string | null
    reportDate: string | null
}

interface MedicalReportDetails {
    id: string
    documentId: string
    hospitalName: string | null
    reportDate: string | null
    reportURL: string | null
    createdAt: string
    markdown: string | null
    passed: boolean | null
    fidelityScore: number | null
    conclusion: string | null
    values: Array<{ id: string; key: string; value: string; unit: string | null }>
}

interface DocumentKnowledgeGraphDetails {
    enabled: boolean
    documentPresent: boolean
    summary: {
        parentChunks: number
        childChunks: number
        reports: number
        observations: number
        metrics: number
        totalNodes: number
        totalEdges: number
    }
    sampleNodes: Array<{ id: string; type: string; label: string }>
    sampleEdges: Array<{ source: string; target: string; type: string; sourceDocumentId?: string | null }>
    message: string | null
}

interface FileItem {
    id: string
    file: File
    progress: number
    base64?: string
    fileType: 'pdf' | 'image'
}

interface FidelitySummary {
    averageFidelityScore: number | null
    scoredReports: number
    totalReports: number
}

interface UserDataClientProps {
    userId: string
    userName: string
    initialDocuments: UserDocument[]
    initialTotalPages: number
    initialFidelitySummary: FidelitySummary
}

interface FormState {
    error: string | null
    success: string | null
}

const MAX_FILES = 10

function SortableFileItem({ item, onRemove, isPending }: { item: FileItem; onRemove: (id: string) => void; isPending: boolean }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

    return (
        <div ref={setNodeRef} style={style} className={`flex items-center gap-3 p-3 bg-[#ffffff] rounded-lg border border-[#d0d9e8] ${isDragging ? 'shadow-lg' : ''}`}>
            <button type="button" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-[#6b7d99] hover:text-[#1e2a3a] transition-colors" disabled={isPending}>
                <GripVertical size={20} />
            </button>
            {item.fileType === 'pdf' ? (
                <div className="rounded-lg bg-[#dbe4f5]/40 p-2 shrink-0"><FileText className="h-4 w-4 text-[#5b7cfa]" /></div>
            ) : (
                <div className="rounded-lg bg-[#4ade80]/10 p-2 shrink-0"><ImageIcon className="h-4 w-4 text-[#4ade80]" /></div>
            )}
            <div className="flex-1 min-w-0">
                <p className="font-medium text-[#1e2a3a] truncate text-sm">{item.file.name}</p>
                <p className="text-xs text-[#6b7d99]">{(item.file.size / 1024 / 1024).toFixed(2)} MB • {item.fileType.toUpperCase()}</p>
            </div>
            {item.progress < 100 && (
                <div className="w-20"><Progress value={item.progress} className="h-1.5 bg-[#dce3f0]" /></div>
            )}
            {item.progress === 100 && <CheckCircle2 className="size-4 text-[#4ade80] shrink-0" />}
            <button type="button" onClick={() => onRemove(item.id)} className="text-[#e74c3c] hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition-colors shrink-0" disabled={isPending}>
                <X size={16} />
            </button>
        </div>
    )
}

export default function UserDataClient({ userId, userName, initialDocuments, initialTotalPages, initialFidelitySummary }: UserDataClientProps) {
    const [files, setFiles] = useState<FileItem[]>([])
    const [dataType, setDataType] = useState<PatientDataType>("COMMENT")
    const [userDocuments, setUserDocuments] = useState<UserDocument[]>(initialDocuments)
    const [isLoadingDocs, setIsLoadingDocs] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(initialTotalPages)
    const [fidelitySummary, setFidelitySummary] = useState<FidelitySummary>(initialFidelitySummary)
    const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false)
    const [deleteAllConfirmationText, setDeleteAllConfirmationText] = useState("")
    const [isDeletingAll, setIsDeletingAll] = useState(false)
    const [showUploadForm, setShowUploadForm] = useState(false)
    const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(null)
    const [documentDetails, setDocumentDetails] = useState<DocumentDetails | null>(null)
    const [medicalReportDetails, setMedicalReportDetails] = useState<MedicalReportDetails | null>(null)
    const [knowledgeGraphDetails, setKnowledgeGraphDetails] = useState<DocumentKnowledgeGraphDetails | null>(null)
    const [isLoadingDetails, setIsLoadingDetails] = useState(false)
    const [reportViewMode, setReportViewMode] = useState<"keyvalue" | "markdown">("keyvalue")
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [documentToDelete, setDocumentToDelete] = useState<UserDocument | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const fetchUserDocuments = async (page: number = 1) => {
        setIsLoadingDocs(true)
        try {
            const [documentsResult, fidelityResult] = await Promise.all([
                getUserDocuments(userId, page),
                getUserAverageFidelitySummary(userId),
            ])
            setUserDocuments(documentsResult.documents.map(doc => ({ ...doc, createdAt: doc.createdAt.toISOString() })))
            setTotalPages(documentsResult.totalPages)
            setFidelitySummary(fidelityResult)
        } catch (error) {
            console.error("Error fetching user documents:", error)
            toast.error("Failed to load documents")
        } finally {
            setIsLoadingDocs(false)
        }
    }

    const fetchDocumentDetails = async (documentId: string) => {
        setIsLoadingDetails(true)
        setMedicalReportDetails(null)
        setDocumentDetails(null)
        setKnowledgeGraphDetails(null)
        setReportViewMode("keyvalue")
        const doc = userDocuments.find(d => d.id === documentId)
        setSelectedDocument(doc || null)

        try {
            if (doc?.patientDataType === 'REPORT') {
                const reportDetails = await getMedicalReportDetails(documentId)
                if (reportDetails) setMedicalReportDetails(reportDetails)
            } else {
                const graphPromise = doc?.patientDataType === 'COMMENT' ? getDocumentKnowledgeGraph(documentId) : Promise.resolve(null)
                const [data, graphDetails] = await Promise.all([getDocumentDetails(documentId), graphPromise])
                if (data) setDocumentDetails(data)
                if (graphDetails) setKnowledgeGraphDetails(graphDetails)
            }
        } catch (error) {
            console.error("Error fetching document details:", error)
            toast.error("Failed to load document details")
        } finally {
            setIsLoadingDetails(false)
        }
    }

    const handleDeleteClick = (e: React.MouseEvent, doc: UserDocument) => {
        e.stopPropagation()
        setDocumentToDelete(doc)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!documentToDelete) return
        setIsDeleting(true)
        try {
            const result = await deleteDocument(documentToDelete.id)
            if (result.success) {
                toast.success("Document deleted", { description: documentToDelete.title })
                await fetchUserDocuments(currentPage)
                if (selectedDocument?.id === documentToDelete.id) {
                    setSelectedDocument(null)
                    setDocumentDetails(null)
                    setMedicalReportDetails(null)
                    setKnowledgeGraphDetails(null)
                }
            } else {
                toast.error("Delete failed", { description: result.message })
            }
        } catch (error) {
            toast.error("An error occurred while deleting")
        } finally {
            setIsDeleting(false)
            setDeleteDialogOpen(false)
            setDocumentToDelete(null)
        }
    }

    const handleDeleteAllConfirm = async () => {
        setIsDeletingAll(true)
        const toastId = toast.loading("Deleting all documents...")
        try {
            const result = await deleteAllDocuments(userId)
            if (result.success) {
                toast.success("All documents deleted", { id: toastId })
                await fetchUserDocuments(1)
                setCurrentPage(1)
                setSelectedDocument(null)
                setDocumentDetails(null)
                setMedicalReportDetails(null)
                setKnowledgeGraphDetails(null)
            } else {
                toast.error("Delete failed", { id: toastId, description: result.message })
            }
        } catch (error) {
            toast.error("An error occurred", { id: toastId })
        } finally {
            setIsDeletingAll(false)
            setIsDeleteAllDialogOpen(false)
            setDeleteAllConfirmationText("")
        }
    }

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => resolve((reader.result as string).split(',')[1])
            reader.onerror = (error) => reject(error)
        })
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const filesArr = Array.from(e.target.files || []) as File[]
        const validFiles = filesArr.filter(file => file.type === 'application/pdf' || file.type.startsWith('image/'))

        if (validFiles.length !== filesArr.length) {
            toast.warning("Some files were skipped", { description: "Only PDF and image files are allowed." })
        }

        const remainingSlots = MAX_FILES - files.length
        if (remainingSlots <= 0) {
            toast.error("Maximum reached", { description: `Maximum of ${MAX_FILES} files already reached.` })
            return
        }

        const filesToAdd = validFiles.slice(0, remainingSlots)
        if (validFiles.length > remainingSlots) {
            toast.info("Files truncated", { description: `Only the first ${remainingSlots} file(s) were added.` })
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
                if (progress <= 90) setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress } : f))
            }, 50)
            try {
                const base64 = await fileToBase64(item.file)
                clearInterval(interval)
                setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: 100, base64 } : f))
            } catch (error) {
                clearInterval(interval)
                setFiles(prev => prev.filter(f => f.id !== item.id))
                toast.error("Processing failed", { description: `Failed to process ${item.file.name}` })
            }
        }
    }

    const handleRemoveFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id))

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

    const uploadAction = async (_prevState: FormState, formData: FormData): Promise<FormState> => {
        if (files.length === 0) return { error: "Please select at least one file.", success: null }
        const title = formData.get("documentTitle") as string
        if (!title?.trim()) return { error: "Please enter a document title.", success: null }
        const allProcessed = files.every(f => f.base64 && f.progress === 100)
        if (!allProcessed) return { error: "Please wait for all files to finish processing.", success: null }

        formData.set("title", title.trim())
        formData.set("userId", userId)
        formData.set("dataType", dataType)
        formData.set("files", JSON.stringify(files.map(f => ({ base64: f.base64!, type: f.fileType, name: f.file.name }))))

        try {
            const result: UploadUserDocumentResult = await uploadUserDocument(formData)
            if (result.success) {
                setFiles([])
                setDataType("COMMENT")
                setShowUploadForm(false)
                fetchUserDocuments(1)
                setCurrentPage(1)
                toast.success("Upload complete", { description: result.message })
                return { error: null, success: result.message }
            } else {
                return { error: result.message, success: null }
            }
        } catch (error) {
            return { error: "An unexpected error occurred. Please try again.", success: null }
        }
    }

    const [formState, formAction, isPending] = useActionState<FormState, FormData>(uploadAction, { error: null, success: null })

    const isLoading = isPending
    const averageFidelityPercent = fidelitySummary.averageFidelityScore !== null ? `${(fidelitySummary.averageFidelityScore * 100).toFixed(1)}%` : "N/A"
    const averageFidelityColor = fidelitySummary.averageFidelityScore === null ? "text-[#6b7d99]" :
        fidelitySummary.averageFidelityScore >= 0.8 ? "text-[#4ade80]" :
        fidelitySummary.averageFidelityScore >= 0.6 ? "text-[#8aa4f0]" :
        fidelitySummary.averageFidelityScore >= 0.4 ? "text-[#e74c3c]" : "text-red-600"
    const fidelityMetaText = fidelitySummary.totalReports === 0 ? "No medical reports uploaded yet" :
        fidelitySummary.scoredReports === 0 ? `No scored reports yet (${fidelitySummary.totalReports} report(s) uploaded)` :
        `${fidelitySummary.scoredReports}/${fidelitySummary.totalReports} report(s) with valid fidelity score`

    const renderKnowledgeGraphSection = () => {
        if (!knowledgeGraphDetails) return null
        return (
            <div className="space-y-3">
                <h3 className="text-sm font-medium text-[#6b7d99] uppercase tracking-wider">Knowledge Graph</h3>
                <div className="rounded-xl border border-[#d0d9e8] bg-[#ffffff] p-4 space-y-4">
                    {!knowledgeGraphDetails.enabled ? (
                        <p className="text-sm text-[#8aa4f0]">{knowledgeGraphDetails.message ?? "Graph database is not configured."}</p>
                    ) : !knowledgeGraphDetails.documentPresent ? (
                        <p className="text-sm text-[#6b7d99]">{knowledgeGraphDetails.message ?? "This document is not present in the graph yet."}</p>
                    ) : (
                        <>
                            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                                {[
                                    { label: "Total Nodes", value: knowledgeGraphDetails.summary.totalNodes },
                                    { label: "Total Edges", value: knowledgeGraphDetails.summary.totalEdges },
                                    { label: "Observations", value: knowledgeGraphDetails.summary.observations },
                                    { label: "Metrics", value: knowledgeGraphDetails.summary.metrics },
                                ].map(item => (
                                    <div key={item.label} className="rounded-lg border border-[#d0d9e8] bg-[#e3e8f2]/30 p-3">
                                        <p className="text-xs text-[#6b7d99]">{item.label}</p>
                                        <p className="text-lg font-semibold text-[#1e2a3a]">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                            {knowledgeGraphDetails.sampleNodes.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-[#6b7d99] uppercase tracking-wider">Sample Nodes</p>
                                    <div className="space-y-2">
                                        {knowledgeGraphDetails.sampleNodes.slice(0, 8).map((node) => (
                                            <div key={node.id} className="rounded-md border border-[#d0d9e8] bg-[#e3e8f2]/30 p-2.5">
                                                <p className="text-sm font-medium text-[#1e2a3a]">{node.label}</p>
                                                <p className="text-xs text-[#6b7d99] mt-0.5">{node.type} • {node.id}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {knowledgeGraphDetails.sampleEdges.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-[#6b7d99] uppercase tracking-wider">Sample Relationships</p>
                                    <div className="space-y-2">
                                        {knowledgeGraphDetails.sampleEdges.slice(0, 8).map((edge, idx) => (
                                            <div key={`${edge.source}-${edge.type}-${edge.target}-${idx}`} className="rounded-md border border-[#d0d9e8] bg-[#e3e8f2]/30 p-2.5">
                                                <p className="text-sm font-mono break-all text-[#1e2a3a]">{edge.source} -[{edge.type}]-&gt; {edge.target}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        )
    }

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
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="/dashboard/users" className="text-[#6b7d99] hover:text-[#1e2a3a]">Users</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block text-[#d0d9e8]" />
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="/dashboard/users/data" className="text-[#6b7d99] hover:text-[#1e2a3a]">User Data</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block text-[#d0d9e8]" />
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-[#1e2a3a] font-medium">{userName || "User"}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </header>

            <div className="flex flex-1 flex-col gap-6 p-6 pt-4 bg-[#eef2f7]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[#1e2a3a]">User Documents</h1>
                        <p className="text-[#6b7d99] mt-1 text-sm">Managing documents for {userName || "User"}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="destructive" onClick={() => setIsDeleteAllDialogOpen(true)} className="bg-red-600 hover:bg-red-700">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete All
                        </Button>
                        <Button variant="outline" onClick={() => fetchUserDocuments(currentPage)} disabled={isLoadingDocs} className="border-[#d0d9e8] text-[#1e2a3a] hover:bg-[#dbe4f5]/30">
                            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingDocs ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                        <Button onClick={() => setShowUploadForm(!showUploadForm)} className="bg-[#5b7cfa] hover:bg-[#4a5fd9] text-white">
                            <UploadCloud className="h-4 w-4 mr-2" />
                            {showUploadForm ? "Cancel" : "Add Documents"}
                        </Button>
                    </div>
                </div>

                {/* Fidelity Card */}
                <Card className="border-[#d0d9e8] bg-[#ffffff] shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-medium text-[#6b7d99] uppercase tracking-wider">Fidelity Overview</p>
                                <h2 className="text-base font-semibold mt-1 text-[#1e2a3a]">Average Report Fidelity</h2>
                                <p className="text-sm text-[#6b7d99] mt-1">{fidelityMetaText}</p>
                            </div>
                            <div className="text-left sm:text-right">
                                <p className={`text-3xl font-bold tracking-tight ${averageFidelityColor}`}>{averageFidelityPercent}</p>
                                <p className="text-xs text-[#6b7d99] mt-1">Across this patient&apos;s reports</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Upload Form */}
                {showUploadForm && (
                    <Card className="border-[#d0d9e8] bg-[#ffffff] shadow-sm">
                        <CardContent className="p-6">
                            <h2 className="text-lg font-semibold mb-4 text-[#1e2a3a]">Upload New Documents</h2>
                            <form action={formAction} className="space-y-6">
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-[#1e2a3a]">Data Type</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setDataType("REPORT")}
                                            disabled={isLoading}
                                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${dataType === "REPORT"
                                                ? "border-[#38bdf8] bg-[#38bdf8]/5"
                                                : "border-[#d0d9e8] hover:border-[#8aa4f0]/40"
                                                }`}
                                        >
                                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${dataType === "REPORT" ? "bg-[#38bdf8]/15" : "bg-[#e3e8f2]"}`}>
                                                <ClipboardList className={`h-5 w-5 ${dataType === "REPORT" ? "text-[#38bdf8]" : "text-[#6b7d99]"}`} />
                                            </div>
                                            <div className="text-left">
                                                <p className={`font-medium ${dataType === "REPORT" ? "text-[#1e2a3a]" : "text-[#6b7d99]"}`}>Medical Report</p>
                                                <p className="text-xs text-[#6b7d99]">Extract key-value pairs</p>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDataType("COMMENT")}
                                            disabled={isLoading}
                                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${dataType === "COMMENT"
                                                ? "border-[#4ade80] bg-[#4ade80]/5"
                                                : "border-[#d0d9e8] hover:border-[#8aa4f0]/40"
                                                }`}
                                        >
                                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${dataType === "COMMENT" ? "bg-[#4ade80]/15" : "bg-[#e3e8f2]"}`}>
                                                <MessageSquare className={`h-5 w-5 ${dataType === "COMMENT" ? "text-[#4ade80]" : "text-[#6b7d99]"}`} />
                                            </div>
                                            <div className="text-left">
                                                <p className={`font-medium ${dataType === "COMMENT" ? "text-[#1e2a3a]" : "text-[#6b7d99]"}`}>Comments / Notes</p>
                                                <p className="text-xs text-[#6b7d99]">Semantic embedding for AI search</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="documentTitle" className="block text-sm font-medium text-[#1e2a3a]">Document Title</label>
                                    <Input id="documentTitle" name="documentTitle" placeholder="Enter a descriptive title..." disabled={isLoading} className="bg-[#ffffff] border-[#d0d9e8] text-[#1e2a3a] placeholder:text-[#6b7d99]/60" />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label htmlFor="fileInput" className="block text-sm font-medium text-[#1e2a3a]">Upload Files (up to {MAX_FILES})</label>
                                        <Badge variant="outline" className="text-xs border-[#d0d9e8] text-[#6b7d99]">{files.length}/{MAX_FILES} files</Badge>
                                    </div>
                                    <input type="file" id="fileInput" name="fileInput" accept=".pdf,application/pdf,image/*" multiple className="hidden" onChange={handleFileChange} disabled={isLoading || files.length >= MAX_FILES} />

                                    {files.length < MAX_FILES && (
                                        <div className="border-2 border-dashed border-[#d0d9e8] rounded-xl p-8 text-center hover:border-[#8aa4f0]/60 bg-[#ffffff]/60 transition-colors">
                                            <div className="space-y-3">
                                                <div className="mx-auto w-12 h-12 rounded-full bg-[#dbe4f5]/40 flex items-center justify-center">
                                                    <UploadCloud className="h-6 w-6 text-[#5b7cfa]" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-[#1e2a3a]">Drag and drop your files here, or</p>
                                                    <label htmlFor="fileInput" className="mt-2 inline-block px-4 py-2 bg-[#5b7cfa] hover:bg-[#4a5fd9] text-white text-sm rounded-lg cursor-pointer transition-colors">Browse files</label>
                                                </div>
                                                <p className="text-xs text-[#6b7d99]">PDF and image files only • {MAX_FILES - files.length} slot(s) remaining</p>
                                            </div>
                                        </div>
                                    )}

                                    {files.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs text-[#6b7d99] flex items-center gap-1.5"><GripVertical size={14} /> Drag to reorder</p>
                                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                                <SortableContext items={files.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                                    <div className="space-y-2">
                                                        {files.map((item, index) => (
                                                            <div key={item.id} className="relative">
                                                                <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#6b7d99] tabular-nums">{index + 1}</span>
                                                                <SortableFileItem item={item} onRemove={handleRemoveFile} isPending={isLoading} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </SortableContext>
                                            </DndContext>
                                        </div>
                                    )}

                                    {files.length >= MAX_FILES && (
                                        <div className="flex items-center gap-2 text-sm text-[#8aa4f0]">
                                            <AlertCircle className="size-4" />
                                            <span>Maximum of {MAX_FILES} files reached</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <Button type="submit" disabled={isLoading || files.length === 0} className="flex-1 bg-[#5b7cfa] hover:bg-[#4a5fd9] text-white">
                                        {isLoading ? <span className="flex items-center justify-center"><Loader2 className="animate-spin mr-2 h-5 w-5" />Processing...</span> : "Upload Documents"}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => { setShowUploadForm(false); setFiles([]); setDataType("COMMENT") }} disabled={isLoading} className="border-[#d0d9e8]">
                                        Cancel
                                    </Button>
                                </div>

                                {(formState.error || formState.success) && (
                                    <div className={`p-4 rounded-lg border flex items-start ${formState.error ? "bg-red-50 border-red-200 text-red-700" : "bg-[#4ade80]/10 border-[#4ade80]/20 text-[#22c55e]"}`}>
                                        <div className={`rounded-full w-6 h-6 mr-3 shrink-0 flex items-center justify-center text-sm font-bold ${formState.error ? "bg-red-100 text-red-600" : "bg-[#4ade80]/15 text-[#22c55e]"}`}>
                                            {formState.error ? "!" : "✓"}
                                        </div>
                                        <div>
                                            <p className="font-medium">{formState.error ? "Error" : "Success"}</p>
                                            <p className="text-sm opacity-90">{formState.error || formState.success}</p>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Documents List */}
                <Card className="border-[#d0d9e8] bg-[#ffffff] shadow-sm">
                    <CardContent className="p-6">
                        <h2 className="text-lg font-semibold mb-4 text-[#1e2a3a]">Documents ({userDocuments.length})</h2>
                        {isLoadingDocs ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="h-8 w-8 animate-spin text-[#6b7d99]" />
                            </div>
                        ) : userDocuments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <FileText className="h-12 w-12 text-[#6b7d99]/40 mb-4" />
                                <p className="text-[#1e2a3a] font-medium">No documents found for this user</p>
                                <p className="text-sm text-[#6b7d99] mt-1">Upload documents to get started</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {userDocuments.map((doc) => (
                                    <div
                                        key={doc.id}
                                        onClick={() => fetchDocumentDetails(doc.id)}
                                        className="flex items-center gap-3 p-3 bg-[#ffffff] rounded-xl border border-[#d0d9e8] cursor-pointer hover:border-[#8aa4f0]/40 hover:shadow-sm transition-all"
                                    >
                                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${doc.patientDataType === 'REPORT' ? "bg-[#38bdf8]/10" : "bg-[#4ade80]/10"}`}>
                                            {doc.patientDataType === 'REPORT' ? (
                                                <ClipboardList className="h-5 w-5 text-[#38bdf8]" />
                                            ) : (
                                                <MessageSquare className="h-5 w-5 text-[#4ade80]" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-[#1e2a3a] truncate">{doc.title}</p>
                                            <div className="flex items-center gap-2 text-xs text-[#6b7d99]">
                                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${doc.patientDataType === 'REPORT' ? "border-[#38bdf8]/30 text-[#38bdf8] bg-[#38bdf8]/5" : "border-[#4ade80]/30 text-[#4ade80] bg-[#4ade80]/5"}`}>
                                                    {doc.patientDataType === 'REPORT' ? 'Report' : 'Comment'}
                                                </Badge>
                                                <span>{new Date(doc.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
                                                {doc.isIngested && (
                                                    <span className="inline-flex items-center gap-1 text-[#4ade80]">
                                                        <Layers className="h-3 w-3" />
                                                        {doc.patientDataType === 'REPORT' ? 'Processed' : 'Embedded'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => handleDeleteClick(e, doc)}
                                            className="text-[#e74c3c] hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors shrink-0"
                                            title="Delete document"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}

                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between pt-4">
                                        <p className="text-sm text-[#6b7d99]">Page {currentPage} of {totalPages}</p>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => { const newPage = Math.max(currentPage - 1, 1); setCurrentPage(newPage); fetchUserDocuments(newPage) }} disabled={currentPage === 1} className="border-[#d0d9e8] text-[#1e2a3a] hover:bg-[#dbe4f5]/30">
                                                <ChevronLeft className="h-4 w-4" /> Previous
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => { const newPage = Math.min(currentPage + 1, totalPages); setCurrentPage(newPage); fetchUserDocuments(newPage) }} disabled={currentPage === totalPages} className="border-[#d0d9e8] text-[#1e2a3a] hover:bg-[#dbe4f5]/30">
                                                Next <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Document Details Sheet */}
                <Sheet open={selectedDocument !== null} onOpenChange={(open) => !open && setSelectedDocument(null)}>
                    <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto p-0 border-[#d0d9e8] bg-[#ffffff]">
                        <SheetHeader className="sticky top-0 z-10 bg-[#ffffff] border-b border-[#d0d9e8] px-6 py-5">
                            <SheetTitle className="text-lg text-[#1e2a3a]">
                                {selectedDocument?.patientDataType === 'REPORT' ? 'Medical Report' : 'Document Details'}
                            </SheetTitle>
                            <SheetDescription className="text-[#6b7d99]">{selectedDocument?.title}</SheetDescription>
                        </SheetHeader>

                        <div className="px-6 py-6 bg-[#eef2f7]">
                            {isLoadingDetails ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="h-8 w-8 animate-spin text-[#6b7d99]" />
                                </div>
                            ) : selectedDocument?.patientDataType === 'REPORT' && medicalReportDetails ? (
                                <div className="space-y-6">
                                    <div className="grid gap-3 grid-cols-2">
                                        {[
                                            { label: "Hospital / Lab", value: medicalReportDetails.hospitalName ?? "Not detected" },
                                            { label: "Report Date", value: medicalReportDetails.reportDate ? new Date(medicalReportDetails.reportDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Not detected" },
                                            { label: "Uploaded", value: selectedDocument ? new Date(selectedDocument.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "-" },
                                            { label: "Test Values", value: `${medicalReportDetails.values.length} extracted` },
                                        ].map(item => (
                                            <div key={item.label} className="p-4 rounded-lg border border-[#d0d9e8] bg-[#ffffff]">
                                                <p className="text-xs font-medium text-[#6b7d99] uppercase tracking-wider">{item.label}</p>
                                                <p className="font-medium mt-1.5 text-sm text-[#1e2a3a]">{item.value}</p>
                                            </div>
                                        ))}
                                        <div className="p-4 rounded-lg border border-[#d0d9e8] bg-[#ffffff]">
                                            <p className="text-xs font-medium text-[#6b7d99] uppercase tracking-wider">Fidelity Score</p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                {medicalReportDetails.fidelityScore !== null ? (
                                                    <>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className={`text-sm font-medium ${medicalReportDetails.fidelityScore >= 0.8 ? "text-[#4ade80]" : medicalReportDetails.fidelityScore >= 0.6 ? "text-[#8aa4f0]" : medicalReportDetails.fidelityScore >= 0.4 ? "text-[#e74c3c]" : "text-red-600"}`}>
                                                                    {(medicalReportDetails.fidelityScore * 100).toFixed(0)}%
                                                                </span>
                                                                {medicalReportDetails.passed !== null && (
                                                                    <Badge variant="outline" className={`text-xs ${medicalReportDetails.passed ? "border-[#4ade80]/30 text-[#4ade80] bg-[#4ade80]/5" : "border-red-200 text-red-600 bg-red-50"}`}>
                                                                        {medicalReportDetails.passed ? "Passed" : "Failed"}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <Progress value={medicalReportDetails.fidelityScore * 100} className="h-1.5 bg-[#dce3f0]" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <span className="text-sm text-[#6b7d99]">Not calculated</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-lg border border-[#d0d9e8] bg-[#ffffff]">
                                            <p className="text-xs font-medium text-[#6b7d99] uppercase tracking-wider">Validation</p>
                                            <p className="font-medium mt-1.5 text-sm">
                                                {medicalReportDetails.passed === true ? <span className="text-[#4ade80]">All values verified</span> :
                                                    medicalReportDetails.passed === false ? <span className="text-red-600">Issues detected</span> :
                                                    <span className="text-[#6b7d99]">Not validated</span>}
                                            </p>
                                        </div>
                                    </div>

                                    {medicalReportDetails.reportURL && (
                                        <a href={medicalReportDetails.reportURL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl border border-[#38bdf8]/30 bg-[#38bdf8]/5 hover:bg-[#38bdf8]/10 transition-colors">
                                            <div className="h-10 w-10 rounded-lg bg-[#38bdf8]/15 flex items-center justify-center shrink-0">
                                                <FileText className="h-5 w-5 text-[#38bdf8]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm text-[#1e2a3a]">View Original Report</p>
                                                <p className="text-xs text-[#6b7d99] truncate">{medicalReportDetails.reportURL}</p>
                                            </div>
                                            <ExternalLink className="h-4 w-4 text-[#38bdf8] shrink-0" />
                                        </a>
                                    )}

                                    {medicalReportDetails.markdown && (
                                        <div className="flex items-center gap-2 bg-[#e3e8f2] rounded-lg p-1">
                                            <button type="button" onClick={() => setReportViewMode("keyvalue")} className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all text-center ${reportViewMode === "keyvalue" ? "bg-[#ffffff] text-[#1e2a3a] shadow-sm" : "text-[#6b7d99] hover:text-[#1e2a3a]"}`}>Key-Value Pairs</button>
                                            <button type="button" onClick={() => setReportViewMode("markdown")} className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all text-center ${reportViewMode === "markdown" ? "bg-[#ffffff] text-[#1e2a3a] shadow-sm" : "text-[#6b7d99] hover:text-[#1e2a3a]"}`}>Raw Text</button>
                                        </div>
                                    )}

                                    {medicalReportDetails.conclusion && (
                                        <div className={`rounded-xl border p-4 ${medicalReportDetails.passed === true ? "bg-[#4ade80]/8 border-[#4ade80]/20" : "bg-[#8aa4f0]/8 border-[#8aa4f0]/20"}`}>
                                            <div className="flex items-start gap-3">
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${medicalReportDetails.passed === true ? "bg-[#4ade80]/15" : "bg-[#8aa4f0]/15"}`}>
                                                    {medicalReportDetails.passed === true ? <CheckCircle2 className="h-4 w-4 text-[#4ade80]" /> : <AlertCircle className="h-4 w-4 text-[#8aa4f0]" />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-sm font-medium mb-1 ${medicalReportDetails.passed === true ? "text-[#22c55e]" : "text-[#d97706]"}`}>
                                                        {medicalReportDetails.passed === true ? "Validation Passed" : "Validation Issues Detected"}
                                                    </p>
                                                    <p className={`text-sm ${medicalReportDetails.passed === true ? "text-[#4ade80]" : "text-[#8aa4f0]"}`}>{medicalReportDetails.conclusion}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {reportViewMode === "markdown" && medicalReportDetails.markdown ? (
                                        <div className="rounded-xl border border-[#d0d9e8] bg-[#ffffff] p-4 overflow-x-auto">
                                            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-[#1e2a3a]">{medicalReportDetails.markdown}</pre>
                                        </div>
                                    ) : (
                                        <div>
                                            {medicalReportDetails.values.length > 0 ? (
                                                <div className="rounded-xl border border-[#d0d9e8] overflow-hidden">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="border-b border-[#d0d9e8] bg-[#e3e8f2]/50">
                                                                <th className="text-left p-3 font-medium text-[#6b7d99] text-xs uppercase tracking-wider">Test Name</th>
                                                                <th className="text-right p-3 font-medium text-[#6b7d99] text-xs uppercase tracking-wider">Value</th>
                                                                <th className="text-left p-3 font-medium text-[#6b7d99] text-xs uppercase tracking-wider">Unit</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-[#d0d9e8]">
                                                            {medicalReportDetails.values.map((val) => (
                                                                <tr key={val.id} className="hover:bg-[#e3e8f2]/30 transition-colors">
                                                                    <td className="p-3 font-medium text-[#1e2a3a]">{val.key}</td>
                                                                    <td className="p-3 text-right tabular-nums font-mono text-[#1e2a3a]">{val.value}</td>
                                                                    <td className="p-3 text-[#6b7d99]">{val.unit ?? "—"}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-[#d0d9e8] bg-[#ffffff]">
                                                    <ClipboardList className="h-10 w-10 text-[#6b7d99]/40 mb-3" />
                                                    <p className="font-medium text-[#1e2a3a]">No test values extracted</p>
                                                    <p className="text-sm text-[#6b7d99] mt-1">The report may not contain recognized test formats.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {renderKnowledgeGraphSection()}
                                </div>
                            ) : documentDetails ? (
                                <div className="space-y-6">
                                    <div className="grid gap-3 grid-cols-2">
                                        {[
                                            { label: "Title", value: selectedDocument?.title ?? "-" },
                                            { label: "Created", value: selectedDocument ? new Date(selectedDocument.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "-" },
                                            { label: "Status", value: selectedDocument?.isIngested ? "Embedded" : "Processing", color: selectedDocument?.isIngested ? "text-[#4ade80]" : "text-[#8aa4f0]" },
                                            { label: "Hospital / Lab", value: documentDetails.hospitalName ?? "Not detected" },
                                            { label: "Report Date", value: documentDetails.reportDate ? new Date(documentDetails.reportDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Not detected" },
                                        ].map(item => (
                                            <div key={item.label} className="p-4 rounded-lg border border-[#d0d9e8] bg-[#ffffff]">
                                                <p className="text-xs font-medium text-[#6b7d99] uppercase tracking-wider">{item.label}</p>
                                                <p className={`font-medium mt-1.5 text-sm ${item.color ?? "text-[#1e2a3a]"}`}>{item.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {documentDetails.reportURL && (
                                        <a href={documentDetails.reportURL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-xl border border-[#38bdf8]/30 bg-[#38bdf8]/5 hover:bg-[#38bdf8]/10 transition-colors">
                                            <div className="h-10 w-10 rounded-lg bg-[#38bdf8]/15 flex items-center justify-center shrink-0">
                                                <FileText className="h-5 w-5 text-[#38bdf8]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm text-[#1e2a3a]">View Original Report</p>
                                                <p className="text-xs text-[#6b7d99] truncate">{documentDetails.reportURL}</p>
                                            </div>
                                            <ExternalLink className="h-4 w-4 text-[#38bdf8] shrink-0" />
                                        </a>
                                    )}

                                    <div className="space-y-3">
                                        <h3 className="text-sm font-medium text-[#6b7d99] uppercase tracking-wider">Chunk Statistics</h3>
                                        <div className="grid gap-3 grid-cols-2">
                                            <div className="flex items-center gap-3 p-4 rounded-lg border border-[#d0d9e8] bg-[#ffffff]">
                                                <div className="h-10 w-10 rounded-lg bg-[#5b7cfa]/10 flex items-center justify-center shrink-0">
                                                    <Layers className="h-5 w-5 text-[#5b7cfa]" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-[#6b7d99]">Parent Chunks</p>
                                                    <p className="text-xl font-bold text-[#1e2a3a]">{documentDetails.parentChunks}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-4 rounded-lg border border-[#d0d9e8] bg-[#ffffff]">
                                                <div className="h-10 w-10 rounded-lg bg-[#38bdf8]/10 flex items-center justify-center shrink-0">
                                                    <FileText className="h-5 w-5 text-[#38bdf8]" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-[#6b7d99]">Child Chunks</p>
                                                    <p className="text-xl font-bold text-[#1e2a3a]">{documentDetails.childChunks}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h3 className="text-sm font-medium text-[#6b7d99] uppercase tracking-wider">Files</h3>
                                        <div className="space-y-2">
                                            {documentDetails.files.map((file, index) => (
                                                <div key={index} className="flex items-center gap-3 p-3 rounded-lg border border-[#d0d9e8] bg-[#ffffff]">
                                                    {file.type === 'pdf' ? (
                                                        <div className="rounded-lg bg-[#dbe4f5]/40 p-2 shrink-0"><FileText className="h-4 w-4 text-[#5b7cfa]" /></div>
                                                    ) : (
                                                        <div className="rounded-lg bg-[#4ade80]/10 p-2 shrink-0"><ImageIcon className="h-4 w-4 text-[#4ade80]" /></div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm text-[#1e2a3a] truncate">{file.name}</p>
                                                        <p className="text-xs text-[#6b7d99] uppercase">{file.type}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {renderKnowledgeGraphSection()}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <FileText className="h-10 w-10 text-[#6b7d99]/40 mb-3" />
                                    <p className="text-[#1e2a3a]">No details available for this document.</p>
                                </div>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>

                <div className="flex justify-center">
                    <Link href="/dashboard/users/data">
                        <Button variant="outline" className="gap-2 border-[#d0d9e8] text-[#1e2a3a] hover:bg-[#dbe4f5]/30">
                            <ArrowLeft className="h-4 w-4" />
                            Back to User Data
                        </Button>
                    </Link>
                </div>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent className="border-[#d0d9e8] bg-[#ffffff]">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-[#1e2a3a]">Delete Document</AlertDialogTitle>
                            <AlertDialogDescription className="text-[#6b7d99]">
                                Are you sure you want to delete &ldquo;{documentToDelete?.title}&rdquo;? This action cannot be undone.
                                {documentToDelete?.patientDataType === 'REPORT' && (
                                    <span className="block mt-2 text-[#e74c3c]">This will also delete all associated medical report data and test values.</span>
                                )}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting} className="border-[#d0d9e8]">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
                                {isDeleting ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Deleting...</span> : "Delete"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Delete All Dialog */}
                <Dialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
                    <DialogContent className="border-[#d0d9e8] bg-[#ffffff]">
                        <DialogHeader>
                            <DialogTitle className="text-[#1e2a3a]">Delete All Documents</DialogTitle>
                            <DialogDescription className="text-[#6b7d99]">
                                Are you sure you want to delete ALL documents for {userName}? This action cannot be undone.
                                <span className="block mt-2 text-[#e74c3c]">This will also delete all associated medical report data, test values, and chunks.</span>
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label htmlFor="delete-all-confirmation" className="text-sm font-medium text-[#1e2a3a]">
                                    Type <span className="font-mono bg-[#e3e8f2] px-1.5 py-0.5 rounded text-[#1e2a3a]">DELETE ALL</span> to confirm
                                </label>
                                <Input id="delete-all-confirmation" value={deleteAllConfirmationText} onChange={(e) => setDeleteAllConfirmationText(e.target.value)} placeholder="Type DELETE ALL to confirm" disabled={isDeletingAll} className="bg-[#ffffff] border-[#d0d9e8] text-[#1e2a3a]" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDeleteAllDialogOpen(false)} disabled={isDeletingAll} className="border-[#d0d9e8]">Cancel</Button>
                            <Button variant="destructive" onClick={handleDeleteAllConfirm} disabled={isDeletingAll || deleteAllConfirmationText !== "DELETE ALL"} className="bg-red-600 hover:bg-red-700">
                                {isDeletingAll ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Deleting...</span> : "Delete All Documents"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    )
}
