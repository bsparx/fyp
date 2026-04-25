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
            className={`flex items-center gap-3 p-3 bg-[#fdfcf9] rounded-lg border border-[#e5e0d8] ${isDragging ? 'shadow-lg' : ''} transition-shadow`}
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-[#8a8279] hover:text-[#3d3630] transition-colors"
                disabled={isPending}
            >
                <GripVertical size={20} />
            </button>
            <div className="rounded-lg bg-[#f0e6c8]/40 p-2 shrink-0">
                <FileText className="h-5 w-5 text-[#8b7355]" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-[#3d3630] truncate text-sm">
                    {item.file.name}
                </p>
                <p className="text-xs text-[#8a8279]">
                    {(item.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
            </div>
            {item.progress < 100 && (
                <div className="w-20">
                    <Progress value={item.progress} className="h-1.5 bg-[#e8e4e0]" />
                </div>
            )}
            {item.progress === 100 && (
                <CheckCircle2 className="size-4 text-[#8fa68e] shrink-0" />
            )}
            <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="text-[#c4705a] hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition-colors shrink-0"
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
            color: "#7a9eaf",
        },
        {
            type: "DISEASE" as const,
            label: "Disease",
            description: "Conditions, symptoms, treatments",
            icon: Activity,
            color: "#c49a6c",
        },
    ]

    return (
        <>
            <PageTitle title="Upload" />
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b border-[#e5e0d8] bg-[#fdfcf9]">
                <div className="flex items-center gap-2 px-6">
                    <SidebarTrigger className="-ml-1 text-[#8a8279] hover:text-[#3d3630] hover:bg-[#f0e6c8]/40" />
                    <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 bg-[#e5e0d8]" />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="/dashboard" className="text-[#8a8279] hover:text-[#3d3630]">Dashboard</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block text-[#e5e0d8]" />
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-[#3d3630] font-medium">Upload PDFs</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </header>

            <div className="flex flex-1 flex-col gap-6 p-6 pt-4 bg-[#faf6f1]">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#3d3630]">Upload Documents</h1>
                    <p className="text-[#8a8279] mt-1 text-sm">
                        Upload PDF documents to be processed and stored in the semantic vector database.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
                    {/* Document Type Selection */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-[#3d3630]">Document Type</label>
                        <div className="grid grid-cols-2 gap-4">
                            {typeCards.map((card) => (
                                <button
                                    key={card.type}
                                    type="button"
                                    onClick={() => setDocumentType(card.type)}
                                    disabled={isLoading}
                                    className={`flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 transition-all duration-200 ${documentType === card.type
                                        ? "border-[#8b7355] bg-[#f0e6c8]/20 shadow-sm"
                                        : "border-[#e5e0d8] bg-[#fdfcf9] hover:border-[#c4a882]/40"
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <div className={`rounded-full p-2.5 ${documentType === card.type ? "bg-[#f0e6c8]/60" : "bg-[#f5f0eb]"}`}>
                                        <card.icon className="h-5 w-5" style={{ color: card.color }} />
                                    </div>
                                    <span className={`font-medium ${documentType === card.type ? "text-[#3d3630]" : "text-[#8a8279]"}`}>{card.label}</span>
                                    <span className="text-xs text-[#8a8279]">{card.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Document Title */}
                    <div className="space-y-2">
                        <label htmlFor="documentTitle" className="block text-sm font-medium text-[#3d3630]">Document Title</label>
                        <input
                            type="text"
                            id="documentTitle"
                            value={documentTitle}
                            onChange={(e) => setDocumentTitle(e.target.value)}
                            placeholder="Enter a descriptive title for this document..."
                            className="w-full px-4 py-2.5 border border-[#e5e0d8] rounded-xl bg-[#fdfcf9] text-[#3d3630] placeholder:text-[#8a8279]/60 focus:outline-none focus:ring-2 focus:ring-[#8b7355]/30 focus:border-[#8b7355] transition-colors"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label htmlFor="pdfFile" className="block text-sm font-medium text-[#3d3630]">
                                Upload PDF Documents (up to {MAX_PDF_FILES})
                            </label>
                            <Badge variant="outline" className="text-xs border-[#e5e0d8] text-[#8a8279]">
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
                            <div className="border-2 border-dashed border-[#e5e0d8] rounded-xl p-8 text-center hover:border-[#c4a882]/60 bg-[#fdfcf9]/60 transition-colors duration-200">
                                <div className="space-y-3">
                                    <div className="mx-auto w-12 h-12 rounded-full bg-[#f0e6c8]/40 flex items-center justify-center">
                                        <UploadCloud className="h-6 w-6 text-[#8b7355]" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-[#3d3630]">Drag and drop your PDFs here, or</p>
                                        <label
                                            htmlFor="pdfFile"
                                            className="mt-2 inline-block px-4 py-2 bg-[#8b7355] hover:bg-[#6b5a42] text-white text-sm rounded-lg cursor-pointer transition-colors duration-200"
                                        >
                                            Browse files
                                        </label>
                                    </div>
                                    <p className="text-xs text-[#8a8279]">
                                        PDF files only, up to 10MB each • {MAX_PDF_FILES - pdfFiles.length} slot(s) remaining
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Sortable file list */}
                        {pdfFiles.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs text-[#8a8279] flex items-center gap-1.5">
                                    <GripVertical size={14} />
                                    Drag to reorder • Files will be processed in this order
                                </p>
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={pdfFiles.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                        <div className="space-y-2">
                                            {pdfFiles.map((item, index) => (
                                                <div key={item.id} className="relative">
                                                    <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8a8279] tabular-nums">
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
                            <div className="flex items-center gap-2 text-sm text-[#c49a6c]">
                                <AlertCircle className="size-4" />
                                <span>Maximum of {MAX_PDF_FILES} PDFs reached</span>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || pdfFiles.length === 0 || !documentTitle.trim()}
                        className="w-full py-3 px-4 bg-[#8b7355] hover:bg-[#6b5a42] text-white font-medium rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b7355]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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

                {/* Info Section */}
                <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm max-w-3xl">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-[#3d3630] flex items-center gap-2">
                            <Info className="size-4 text-[#8b7355]" />
                            About Document Processing
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm text-[#8a8279] space-y-2">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="size-4 text-[#8fa68e] mt-0.5 shrink-0" />
                                PDFs will be parsed and converted to text using AI vision models
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="size-4 text-[#8fa68e] mt-0.5 shrink-0" />
                                Text will be split into chunks for optimal retrieval
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="size-4 text-[#8fa68e] mt-0.5 shrink-0" />
                                Chunks will be embedded using Voyage AI and stored in Pinecone
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="size-4 text-[#8fa68e] mt-0.5 shrink-0" />
                                Processing may take a few minutes for large documents
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </>
    )
}
