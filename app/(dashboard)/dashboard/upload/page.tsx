"use client"

import { useState, useRef, useTransition } from "react"
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
import {
    FileText,
    X,
    Loader2,
    UploadCloud,
    GripVertical,
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

function SortablePdfItem({
    item,
    onRemove,
    isPending
}: {
    item: PdfFileItem
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
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 dark:text-slate-100 truncate text-sm">
                    {item.file.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {(item.file.size / 1024 / 1024).toFixed(2)} MB
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

export default function UploadPage() {
    const [pdfFiles, setPdfFiles] = useState<PdfFileItem[]>([])
    const [isPending, startTransition] = useTransition()
    const [isProcessing, setIsProcessing] = useState(false)
    const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null)
    const [documentTitle, setDocumentTitle] = useState("")
    const fileInputRef = useRef<HTMLInputElement>(null)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => {
                const result = reader.result as string
                // Remove the data:application/pdf;base64, prefix
                const base64 = result.split(',')[1]
                resolve(base64)
            }
            reader.onerror = (error) => reject(error)
        })
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []) as File[]
        const validFiles = files.filter(file => file.type === 'application/pdf')

        if (validFiles.length !== files.length) {
            setMessage({ error: true, text: "Some files were skipped. Only PDF files are allowed." })
        }

        const remainingSlots = 5 - pdfFiles.length

        if (remainingSlots <= 0) {
            setMessage({ error: true, text: "Maximum of 5 PDFs already reached." })
            return
        }

        const filesToAdd = validFiles.slice(0, remainingSlots)

        if (validFiles.length > remainingSlots) {
            setMessage({ error: true, text: `Only the first ${remainingSlots} file(s) were added. Maximum is 5 PDFs total.` })
        }

        const newPdfItems: PdfFileItem[] = filesToAdd.map((file) => ({
            id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            progress: 0,
        }))

        setPdfFiles(prev => [...prev, ...newPdfItems])

        // Convert files to base64 and simulate progress
        for (const item of newPdfItems) {
            let progress = 0
            const interval = setInterval(() => {
                progress += 10
                if (progress <= 90) {
                    setPdfFiles(prev =>
                        prev.map(f => f.id === item.id ? { ...f, progress } : f)
                    )
                }
            }, 50)

            try {
                const base64 = await fileToBase64(item.file)
                clearInterval(interval)
                setPdfFiles(prev =>
                    prev.map(f => f.id === item.id ? { ...f, progress: 100, base64 } : f)
                )
            } catch (error) {
                clearInterval(interval)
                console.error("Error converting file to base64:", error)
                setPdfFiles(prev => prev.filter(f => f.id !== item.id))
                setMessage({ error: true, text: `Failed to process ${item.file.name}` })
            }
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleRemoveFile = (id: string) => {
        setPdfFiles(prev => prev.filter(f => f.id !== id))
        setMessage(null)
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
            setMessage({ error: true, text: "Please select at least one PDF file." })
            return
        }

        if (!documentTitle.trim()) {
            setMessage({ error: true, text: "Please enter a document title." })
            return
        }

        // Check if all files have been processed to base64
        const allProcessed = pdfFiles.every(f => f.base64 && f.progress === 100)
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

                // Send base64 data as JSON array (in order)
                const pdfBase64Array = pdfFiles.map(f => f.base64!)
                formData.set("pdfFiles", JSON.stringify(pdfBase64Array))

                const result = await uploadDocument(formData)

                if (result.success) {
                    setMessage({ error: false, text: result.message })
                    setPdfFiles([])
                    setDocumentTitle("")
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
                                <BreadcrumbPage>Upload PDFs</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </header>

            <div className="flex flex-1 flex-col gap-6 p-6 pt-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Upload Documents</h1>
                    <p className="text-muted-foreground mt-2">
                        Upload PDF documents to be processed and stored in the semantic vector database.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Document Title */}
                    <div className="space-y-2">
                        <label
                            htmlFor="documentTitle"
                            className="block text-sm font-medium text-slate-700 dark:text-slate-200"
                        >
                            Document Title
                        </label>
                        <input
                            type="text"
                            id="documentTitle"
                            value={documentTitle}
                            onChange={(e) => setDocumentTitle(e.target.value)}
                            placeholder="Enter a descriptive title for this document..."
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label
                                htmlFor="pdfFile"
                                className="block text-sm font-medium text-slate-700 dark:text-slate-200"
                            >
                                Upload PDF Documents (up to 5)
                            </label>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                {pdfFiles.length}/5 files
                            </span>
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
                            disabled={isLoading || pdfFiles.length >= 5}
                        />

                        {/* Upload area - only show if less than 5 files */}
                        {pdfFiles.length < 5 && (
                            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50/50 dark:bg-slate-800/30 transition-colors duration-200">
                                <div className="space-y-3">
                                    <div className="mx-auto w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                        <UploadCloud className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-700 dark:text-slate-300">
                                            Drag and drop your PDFs here, or
                                        </p>
                                        <label
                                            htmlFor="pdfFile"
                                            className="mt-2 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white text-sm rounded-lg cursor-pointer transition-colors duration-200"
                                        >
                                            Browse files
                                        </label>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        PDF files only, up to 10MB each • {5 - pdfFiles.length} slot(s) remaining
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Sortable file list */}
                        {pdfFiles.length > 0 && (
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
                                        items={pdfFiles.map(f => f.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-2">
                                            {pdfFiles.map((item, index) => (
                                                <div key={item.id} className="relative">
                                                    <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
                                                        {index + 1}
                                                    </span>
                                                    <SortablePdfItem
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

                        {pdfFiles.length >= 5 && (
                            <p className="text-amber-600 dark:text-amber-400 text-sm flex items-center gap-1.5">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400"></span>
                                Maximum of 5 PDFs reached
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || pdfFiles.length === 0 || !documentTitle.trim()}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white font-medium rounded-lg shadow-sm dark:shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center">
                                <Loader2 className="animate-spin mr-2 h-5 w-5" />
                                Processing {pdfFiles.length > 1 ? `${pdfFiles.length} PDFs` : 'PDF'}...
                            </span>
                        ) : (
                            pdfFiles.length > 1
                                ? `Upload ${pdfFiles.length} PDFs`
                                : "Upload Document"
                        )}
                    </button>

                    {message && (
                        <div
                            className={`p-4 rounded-lg border ${message.error
                                ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300"
                                : "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-800 dark:text-green-300"
                                } mt-4 flex items-start`}
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

                {/* Info Section */}
                <div className="rounded-xl border bg-muted/50 p-6">
                    <h3 className="font-semibold mb-2">About Document Processing</h3>
                    <ul className="text-sm text-muted-foreground space-y-2">
                        <li>• PDFs will be parsed and converted to text using AI vision models</li>
                        <li>• Text will be split into chunks for optimal retrieval</li>
                        <li>• Chunks will be embedded using Voyage AI and stored in Pinecone</li>
                        <li>• Processing may take a few minutes for large documents</li>
                        <li>• Documents are stored in the database for easy management and deletion</li>
                    </ul>
                </div>
            </div>
        </>
    )
}
