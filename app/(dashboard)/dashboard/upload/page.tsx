"use client"

import { useState, useRef, useTransition } from "react"
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    FileText,
    X,
    Loader2,
    UploadCloud,
    GripVertical,
    Pill,
    Activity,
    Info,
    CheckCircle2,
    AlertCircle,
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
import { uploadDocument } from "./actions"

interface PdfFileItem {
    id: string
    file: File
    progress: number
    base64?: string
}

const MAX_PDF_FILES = 10

function SortablePdfItem({
    item,
    onRemove,
    isPending
}: {
    item: PdfFileItem
    onRemove: (id: string) => void
    isPending: boolean
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-3 p-3 bg-[#ffffff] rounded-lg border border-[#d0d9e8] ${isDragging ? 'shadow-lg' : ''} transition-shadow`}
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-[#6b7d99] hover:text-[#1e2a3a] transition-colors"
                disabled={isPending}
            >
                <GripVertical size={20} />
            </button>
            <div className="rounded-lg bg-[#dbe4f5]/40 p-2 shrink-0">
                <FileText className="h-5 w-5 text-[#5b7cfa]" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-[#1e2a3a] truncate text-sm">
                    {item.file.name}
                </p>
                <p className="text-xs text-[#6b7d99]">
                    {(item.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
            </div>
            {item.progress < 100 && (
                <div className="w-20">
                    <Progress value={item.progress} className="h-1.5 bg-[#dce3f0]" />
                </div>
            )}
            {item.progress === 100 && (
                <CheckCircle2 className="size-4 text-[#4ade80] shrink-0" />
            )}
            <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="text-[#e74c3c] hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition-colors shrink-0"
                disabled={isPending}
            >
                <X size={16} />
            </button>
        </div>
    )
}

import { PageTitle } from "@/components/page-title"

export default function UploadPage() {
    const [pdfFiles, setPdfFiles] = useState<PdfFileItem[]>([])
    const [isPending, startTransition] = useTransition()
    const [isProcessing, setIsProcessing] = useState(false)
    const [documentTitle, setDocumentTitle] = useState("")
    const [documentType, setDocumentType] = useState<"MEDICINE" | "DISEASE">("MEDICINE")
    const fileInputRef = useRef<HTMLInputElement>(null)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => {
                const result = reader.result as string
                resolve(result.split(',')[1])
            }
            reader.onerror = (error) => reject(error)
        })
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []) as File[]
        const validFiles = files.filter(file => file.type === 'application/pdf')

        if (validFiles.length !== files.length) {
            toast.warning("Some files were skipped", { description: "Only PDF files are allowed." })
        }

        const remainingSlots = MAX_PDF_FILES - pdfFiles.length
        if (remainingSlots <= 0) {
            toast.error("Maximum reached", { description: `Maximum of ${MAX_PDF_FILES} PDFs already reached.` })
            return
        }

        const filesToAdd = validFiles.slice(0, remainingSlots)
        if (validFiles.length > remainingSlots) {
            toast.info("Files truncated", { description: `Only the first ${remainingSlots} file(s) were added.` })
        }

        const newPdfItems: PdfFileItem[] = filesToAdd.map((file) => ({
            id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            progress: 0,
        }))

        setPdfFiles(prev => [...prev, ...newPdfItems])

        for (const item of newPdfItems) {
            let progress = 0
            const interval = setInterval(() => {
                progress += 10
                if (progress <= 90) {
                    setPdfFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress } : f))
                }
            }, 50)

            try {
                const base64 = await fileToBase64(item.file)
                clearInterval(interval)
                setPdfFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: 100, base64 } : f))
            } catch (error) {
                clearInterval(interval)
                console.error("Error converting file to base64:", error)
                setPdfFiles(prev => prev.filter(f => f.id !== item.id))
                toast.error("Processing failed", { description: `Failed to process ${item.file.name}` })
            }
        }

        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleRemoveFile = (id: string) => {
        setPdfFiles(prev => prev.filter(f => f.id !== id))
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            setPdfFiles((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id)
                const newIndex = items.findIndex(item => item.id === over.id)
                return arrayMove(items, oldIndex, newIndex)
            })
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (pdfFiles.length === 0) {
            toast.error("No files selected", { description: "Please select at least one PDF file." })
            return
        }
        if (!documentTitle.trim()) {
            toast.error("Title required", { description: "Please enter a document title." })
            return
        }

        const allProcessed = pdfFiles.every(f => f.base64 && f.progress === 100)
        if (!allProcessed) {
            toast.error("Processing incomplete", { description: "Please wait for all files to finish processing." })
            return
        }

        setIsProcessing(true)
        const toastId = toast.loading(`Uploading ${pdfFiles.length} document(s)...`)

        startTransition(async () => {
            try {
                const formData = new FormData()
                formData.set("title", documentTitle.trim())
                formData.set("ragSubtype", documentType)
                formData.set("pdfFiles", JSON.stringify(pdfFiles.map(f => ({ base64: f.base64!, name: f.file.name }))))

                const result = await uploadDocument(formData)

                if (result.success) {
                    toast.success("Upload complete", {
                        id: toastId,
                        description: result.message,
                    })
                    setPdfFiles([])
                    setDocumentTitle("")
                } else {
                    toast.error("Upload failed", {
                        id: toastId,
                        description: result.message,
                    })
                }
            } catch (error) {
                console.error("Error uploading document:", error)
                toast.error("Unexpected error", {
                    id: toastId,
                    description: "An unexpected error occurred. Please try again.",
                })
            } finally {
                setIsProcessing(false)
            }
        })
    }

    const isLoading = isPending || isProcessing

    const typeCards = [
        {
            type: "MEDICINE" as const,
            label: "Medicine",
            description: "Drug information, dosages, side effects",
            icon: Pill,
            color: "#38bdf8",
        },
        {
            type: "DISEASE" as const,
            label: "Disease",
            description: "Conditions, symptoms, treatments",
            icon: Activity,
            color: "#8aa4f0",
        },
    ]

    return (
        <>
            <PageTitle title="Upload" />
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
                                <BreadcrumbPage className="text-[#1e2a3a] font-medium">Upload PDFs</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </header>

            <div className="flex flex-1 flex-col gap-6 p-6 pt-4 bg-[#eef2f7]">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#1e2a3a]">Upload Documents</h1>
                    <p className="text-[#6b7d99] mt-1 text-sm">
                        Upload PDF documents to be processed and stored in the semantic vector database.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-2">
                    {/* Document Type Selection */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-[#1e2a3a]">Document Type</label>
                        <div className="grid grid-cols-2 gap-4">
                            {typeCards.map((card) => (
                                <button
                                    key={card.type}
                                    type="button"
                                    onClick={() => setDocumentType(card.type)}
                                    disabled={isLoading}
                                    className={`flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 transition-all duration-200 ${documentType === card.type
                                        ? "border-[#5b7cfa] bg-[#dbe4f5]/20 shadow-sm"
                                        : "border-[#d0d9e8] bg-[#ffffff] hover:border-[#8aa4f0]/40"
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <div className={`rounded-full p-2.5 ${documentType === card.type ? "bg-[#dbe4f5]/60" : "bg-[#e3e8f2]"}`}>
                                        <card.icon className="h-5 w-5" style={{ color: card.color }} />
                                    </div>
                                    <span className={`font-medium ${documentType === card.type ? "text-[#1e2a3a]" : "text-[#6b7d99]"}`}>{card.label}</span>
                                    <span className="text-xs text-[#6b7d99]">{card.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Document Title */}
                    <div className="space-y-2">
                        <label htmlFor="documentTitle" className="block text-sm font-medium text-[#1e2a3a]">Document Title</label>
                        <input
                            type="text"
                            id="documentTitle"
                            value={documentTitle}
                            onChange={(e) => setDocumentTitle(e.target.value)}
                            placeholder="Enter a descriptive title for this document..."
                            className="w-full px-4 py-2.5 border border-[#d0d9e8] rounded-xl bg-[#ffffff] text-[#1e2a3a] placeholder:text-[#6b7d99]/60 focus:outline-none focus:ring-2 focus:ring-[#5b7cfa]/30 focus:border-[#5b7cfa] transition-colors"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label htmlFor="pdfFile" className="block text-sm font-medium text-[#1e2a3a]">
                                Upload PDF Documents (up to {MAX_PDF_FILES})
                            </label>
                            <Badge variant="outline" className="text-xs border-[#d0d9e8] text-[#6b7d99]">
                                {pdfFiles.length}/{MAX_PDF_FILES} files
                            </Badge>
                        </div>

                        <input
                            type="file"
                            id="pdfFile"
                            name="pdfFile"
                            accept=".pdf,application/pdf"
                            multiple={true}
                            className="hidden"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            disabled={isLoading || pdfFiles.length >= MAX_PDF_FILES}
                        />

                        {/* Upload area */}
                        {pdfFiles.length < MAX_PDF_FILES && (
                            <div className="border-2 border-dashed border-[#d0d9e8] rounded-xl p-8 text-center hover:border-[#8aa4f0]/60 bg-[#ffffff]/60 transition-colors duration-200">
                                <div className="space-y-3">
                                    <div className="mx-auto w-12 h-12 rounded-full bg-[#dbe4f5]/40 flex items-center justify-center">
                                        <UploadCloud className="h-6 w-6 text-[#5b7cfa]" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-[#1e2a3a]">Drag and drop your PDFs here, or</p>
                                        <label
                                            htmlFor="pdfFile"
                                            className="mt-2 inline-block px-4 py-2 bg-[#5b7cfa] hover:bg-[#4a5fd9] text-white text-sm rounded-lg cursor-pointer transition-colors duration-200"
                                        >
                                            Browse files
                                        </label>
                                    </div>
                                    <p className="text-xs text-[#6b7d99]">
                                        PDF files only, up to 10MB each • {MAX_PDF_FILES - pdfFiles.length} slot(s) remaining
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Sortable file list */}
                        {pdfFiles.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs text-[#6b7d99] flex items-center gap-1.5">
                                    <GripVertical size={14} />
                                    Drag to reorder • Files will be processed in this order
                                </p>
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={pdfFiles.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                        <div className="space-y-2">
                                            {pdfFiles.map((item, index) => (
                                                <div key={item.id} className="relative">
                                                    <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#6b7d99] tabular-nums">
                                                        {index + 1}
                                                    </span>
                                                    <SortablePdfItem item={item} onRemove={handleRemoveFile} isPending={isLoading} />
                                                </div>
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>
                        )}

                        {pdfFiles.length >= MAX_PDF_FILES && (
                            <div className="flex items-center gap-2 text-sm text-[#8aa4f0]">
                                <AlertCircle className="size-4" />
                                <span>Maximum of {MAX_PDF_FILES} PDFs reached</span>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || pdfFiles.length === 0 || !documentTitle.trim()}
                        className="w-full py-3 px-4 bg-[#5b7cfa] hover:bg-[#4a5fd9] text-white font-medium rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5b7cfa]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center">
                                <Loader2 className="animate-spin mr-2 h-5 w-5" />
                                Processing {pdfFiles.length > 1 ? `${pdfFiles.length} PDFs` : 'PDF'}...
                            </span>
                        ) : (
                            pdfFiles.length > 1 ? `Upload ${pdfFiles.length} PDFs` : "Upload Document"
                        )}
                    </button>
                </form>

                <div className="flex flex-col gap-6">
                    <Card className="border-[#d0d9e8] bg-[#ffffff] shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold text-[#1e2a3a] flex items-center gap-2">
                                <Info className="size-4 text-[#5b7cfa]" />
                                About Document Processing
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="text-sm text-[#6b7d99] space-y-2">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="size-4 text-[#4ade80] mt-0.5 shrink-0" />
                                    PDFs will be parsed and converted to text using AI vision models
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="size-4 text-[#4ade80] mt-0.5 shrink-0" />
                                    Text will be split into chunks for optimal retrieval
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="size-4 text-[#4ade80] mt-0.5 shrink-0" />
                                    Chunks will be embedded using Voyage AI and stored in Pinecone
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="size-4 text-[#4ade80] mt-0.5 shrink-0" />
                                    Processing may take a few minutes for large documents
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
        </>
    )
}
