"use client";

import * as React from "react";
import { toast } from "sonner";
import {
    FileText,
    Trash2,
    CheckCircle,
    XCircle,
    Search,
    MoreHorizontal,
    Pill,
    Activity,
    Network,
    Loader2,
    RefreshCw,
    Eye,
    ScrollText,
} from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GraphVisualization } from "@/components/graph-visualization";
import {
    deleteDocument,
    getDocumentFullGraph,
    getDomainFullGraph,
    type DatabaseFullGraph,
    type DocumentWithStats,
} from "./actions";

type TypeFilter = "ALL" | "MEDICINE" | "DISEASE";

interface BrowseDocumentsClientProps {
    documents: DocumentWithStats[];
}

export function BrowseDocumentsClient({ documents: initialDocuments }: BrowseDocumentsClientProps) {
    const [documents, setDocuments] = React.useState(initialDocuments);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("ALL");
    const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
    const [pendingDeleteDoc, setPendingDeleteDoc] = React.useState<DocumentWithStats | null>(null);
    const [graphDialogOpen, setGraphDialogOpen] = React.useState(false);
    const [graphTitle, setGraphTitle] = React.useState("Knowledge Graph");
    const [graphData, setGraphData] = React.useState<DatabaseFullGraph | null>(null);
    const [graphError, setGraphError] = React.useState<string | null>(null);
    const [isGraphLoading, setIsGraphLoading] = React.useState(false);

    const [previewDoc, setPreviewDoc] = React.useState<DocumentWithStats | null>(null);
    const [previewOpen, setPreviewOpen] = React.useState(false);

    const filteredDocuments = React.useMemo(() => {
        let filtered = documents;
        if (typeFilter !== "ALL") {
            filtered = filtered.filter((doc) => doc.ragSubtype === typeFilter);
        }
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (doc) =>
                    doc.title.toLowerCase().includes(query) ||
                    doc.content.toLowerCase().includes(query)
            );
        }
        return filtered;
    }, [documents, searchQuery, typeFilter]);

    const handleDelete = async (documentId: string) => {
        setIsDeleting(documentId);
        const toastId = toast.loading("Deleting document...");
        try {
            const result = await deleteDocument(documentId);
            if (result.success) {
                setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
                toast.success("Document deleted", { id: toastId });
            } else {
                toast.error("Delete failed", { id: toastId, description: result.error || "Unknown error" });
            }
        } catch (error) {
            toast.error("Delete failed", { id: toastId, description: "An unexpected error occurred." });
        } finally {
            setIsDeleting(null);
        }
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const truncateText = (text: string, maxLength: number = 100) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + "...";
    };

    const confirmDelete = async () => {
        if (!pendingDeleteDoc) return;
        await handleDelete(pendingDeleteDoc.id);
        setPendingDeleteDoc(null);
    };

    const openDocumentGraph = async (doc: DocumentWithStats) => {
        setGraphDialogOpen(true);
        setGraphTitle(`Document Graph: ${doc.title}`);
        setGraphData(null);
        setGraphError(null);
        setIsGraphLoading(true);
        try {
            const data = await getDocumentFullGraph(doc.id);
            setGraphData(data);
        } catch (error) {
            console.error("Error loading document graph:", error);
            setGraphError("Failed to load this document graph.");
        } finally {
            setIsGraphLoading(false);
        }
    };

    const openDomainGraph = async (domain: "medicine" | "disease") => {
        setGraphDialogOpen(true);
        setGraphTitle(`Complete ${domain === "medicine" ? "Medicine" : "Disease"} Graph`);
        setGraphData(null);
        setGraphError(null);
        setIsGraphLoading(true);
        try {
            const data = await getDomainFullGraph(domain);
            setGraphData(data);
        } catch (error) {
            setGraphError(`Failed to load the ${domain} graph.`);
        } finally {
            setIsGraphLoading(false);
        }
    };

    return (
        <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
            <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="text-[#3d3630]">Documents</CardTitle>
                        <CardDescription className="text-[#8a8279]">
                            {filteredDocuments.length} of {documents.length} document{documents.length !== 1 ? "s" : ""} in the database
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 border-[#e5e0d8] text-[#3d3630] hover:bg-[#f0e6c8]/30"
                            onClick={() => void openDomainGraph("medicine")}
                            disabled={isGraphLoading}
                        >
                            <Network className="h-3.5 w-3.5 text-[#7a9eaf]" />
                            Medicine Graph
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 border-[#e5e0d8] text-[#3d3630] hover:bg-[#f0e6c8]/30"
                            onClick={() => void openDomainGraph("disease")}
                            disabled={isGraphLoading}
                        >
                            <Network className="h-3.5 w-3.5 text-[#c49a6c]" />
                            Disease Graph
                        </Button>
                        <Select value={typeFilter} onValueChange={(value: TypeFilter) => setTypeFilter(value)}>
                            <SelectTrigger className="w-[140px] border-[#e5e0d8] bg-[#fdfcf9]">
                                <SelectValue placeholder="Filter by type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Types</SelectItem>
                                <SelectItem value="MEDICINE">
                                    <span className="flex items-center gap-2 text-[#3d3630]">
                                        <Pill className="h-3.5 w-3.5 text-[#7a9eaf]" />
                                        Medicine
                                    </span>
                                </SelectItem>
                                <SelectItem value="DISEASE">
                                    <span className="flex items-center gap-2 text-[#3d3630]">
                                        <Activity className="h-3.5 w-3.5 text-[#c49a6c]" />
                                        Disease
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#8a8279]" />
                            <Input
                                type="search"
                                placeholder="Filter documents..."
                                className="pl-8 border-[#e5e0d8] bg-[#fdfcf9] text-[#3d3630] placeholder:text-[#8a8279]/60"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {filteredDocuments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <FileText className="h-12 w-12 text-[#8a8279]/40 mb-4" />
                        <h3 className="text-lg font-semibold text-[#3d3630]">No documents found</h3>
                        <p className="text-sm text-[#8a8279] mt-1">
                            {searchQuery ? "Try a different search query" : "Upload documents to get started"}
                        </p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-[#e5e0d8] overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-[#e5e0d8] hover:bg-transparent bg-[#f5f0eb]/50">
                                    <TableHead className="text-[#8a8279] font-medium">Title</TableHead>
                                    <TableHead className="text-[#8a8279] font-medium">Type</TableHead>
                                    <TableHead className="text-[#8a8279] font-medium">Status</TableHead>
                                    <TableHead className="text-[#8a8279] font-medium text-right">Parent Chunks</TableHead>
                                    <TableHead className="text-[#8a8279] font-medium text-right">RAG Chunks</TableHead>
                                    <TableHead className="text-[#8a8279] font-medium">Created</TableHead>
                                    <TableHead className="w-[70px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDocuments.map((doc) => (
                                    <TableRow key={doc.id} className="border-[#e5e0d8]/60 hover:bg-[#f5f0eb]/50 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="rounded-lg bg-[#f0e6c8]/40 p-2 shrink-0">
                                                    <FileText className="h-4 w-4 text-[#8b7355]" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-[#3d3630]">{truncateText(doc.title, 40)}</div>
                                                    <div className="text-xs text-[#8a8279]">
                                                        {truncateText(doc.content, 60)}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {doc.ragSubtype === "MEDICINE" ? (
                                                <Badge variant="outline" className="gap-1 text-[#7a9eaf] border-[#7a9eaf]/30 bg-[#7a9eaf]/10">
                                                    <Pill className="h-3 w-3" />
                                                    Medicine
                                                </Badge>
                                            ) : doc.ragSubtype === "DISEASE" ? (
                                                <Badge variant="outline" className="gap-1 text-[#c49a6c] border-[#c49a6c]/30 bg-[#c49a6c]/10">
                                                    <Activity className="h-3 w-3" />
                                                    Disease
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[#8a8279] border-[#e5e0d8]">Unknown</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {doc.isIngested ? (
                                                <Badge variant="outline" className="gap-1 text-[#8fa68e] border-[#8fa68e]/30 bg-[#8fa68e]/10">
                                                    <CheckCircle className="h-3 w-3" />
                                                    Ingested
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="gap-1 text-[#c49a6c] border-[#c49a6c]/30 bg-[#c49a6c]/10">
                                                    <XCircle className="h-3 w-3" />
                                                    Pending
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-[#3d3630]">
                                            {doc._count.parentChunks}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-[#3d3630]">
                                            {doc._count.ragChunks}
                                        </TableCell>
                                        <TableCell className="text-[#8a8279]">{formatDate(doc.createdAt)}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8a8279] hover:text-[#3d3630] hover:bg-[#f0e6c8]/30">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Open menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onSelect={(event) => { event.preventDefault(); void openDocumentGraph(doc); }}>
                                                        <Network className="mr-2 h-4 w-4 text-[#7a9eaf]" />
                                                        View Graph
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onSelect={(event) => { event.preventDefault(); setPreviewDoc(doc); setPreviewOpen(true); }}
                                                    >
                                                        <Eye className="mr-2 h-4 w-4 text-[#7a9eaf]" />
                                                        View Content
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:text-red-600"
                                                        onSelect={(event) => { event.preventDefault(); setPendingDeleteDoc(doc); }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>

            <AlertDialog
                open={pendingDeleteDoc !== null}
                onOpenChange={(open) => { if (!open) setPendingDeleteDoc(null); }}
            >
                <AlertDialogContent className="border-[#e5e0d8] bg-[#fdfcf9]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-[#3d3630]">Delete Document</AlertDialogTitle>
                        <AlertDialogDescription className="text-[#8a8279]">
                            Are you sure you want to delete <strong className="text-[#3d3630]">&quot;{pendingDeleteDoc?.title}&quot;</strong>? This will permanently remove the
                            document, SQL parent chunks, graph data, and embeddings from the vector database.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={Boolean(isDeleting)} className="border-[#e5e0d8]">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            disabled={!pendingDeleteDoc || isDeleting === pendingDeleteDoc.id}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            {pendingDeleteDoc && isDeleting === pendingDeleteDoc.id ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog
                open={graphDialogOpen}
                onOpenChange={(open) => {
                    setGraphDialogOpen(open);
                    if (!open) setGraphError(null);
                }}
            >
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-6xl overflow-hidden border-[#e5e0d8] bg-[#fdfcf9]">
                    <DialogHeader>
                        <DialogTitle className="text-[#3d3630]">{graphTitle}</DialogTitle>
                        <DialogDescription className="text-[#8a8279]">
                            Complete Neo4j graph view for this scope.
                        </DialogDescription>
                    </DialogHeader>

                    {isGraphLoading ? (
                        <div className="flex min-h-[300px] items-center justify-center gap-2 text-[#8a8279]">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Loading graph...
                        </div>
                    ) : graphError ? (
                        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            {graphError}
                        </div>
                    ) : !graphData ? (
                        <div className="rounded-md border border-[#e5e0d8] p-4 text-sm text-[#8a8279]">
                            Select a graph to view.
                        </div>
                    ) : !graphData.enabled ? (
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                            {graphData.message ?? "Neo4j is not configured in this environment."}
                        </div>
                    ) : !graphData.graphPresent ? (
                        <div className="rounded-md border border-[#e5e0d8] p-4 text-sm text-[#8a8279]">
                            {graphData.message ?? "No graph data found for this scope yet."}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="border-[#e5e0d8] text-[#3d3630]">Nodes: {graphData.nodes.length}</Badge>
                                <Badge variant="outline" className="border-[#e5e0d8] text-[#3d3630]">Relationships: {graphData.edges.length}</Badge>
                                {graphData.nodeTypeCounts.map((entry) => (
                                    <Badge key={entry.type} variant="secondary" className="bg-[#f5f0eb] text-[#3d3630]">
                                        {entry.type}: {entry.count}
                                    </Badge>
                                ))}
                            </div>

                            <Tabs defaultValue="graph" className="w-full">
                                <TabsList className="bg-[#f5f0eb]">
                                    <TabsTrigger value="graph" className="data-[state=active]:bg-[#fdfcf9] data-[state=active]:text-[#3d3630]">
                                        <Network className="size-3 mr-1.5" />
                                        Graph
                                    </TabsTrigger>
                                    <TabsTrigger value="nodes" className="data-[state=active]:bg-[#fdfcf9] data-[state=active]:text-[#3d3630]">Nodes ({graphData.nodes.length})</TabsTrigger>
                                    <TabsTrigger value="edges" className="data-[state=active]:bg-[#fdfcf9] data-[state=active]:text-[#3d3630]">Relationships ({graphData.edges.length})</TabsTrigger>
                                </TabsList>

                                <TabsContent value="graph" className="mt-3">
                                    <GraphVisualization graphData={graphData} height={520} />
                                </TabsContent>

                                <TabsContent value="nodes" className="mt-3">
                                    <ScrollArea className="h-[55vh] rounded-md border border-[#e5e0d8] p-3 bg-[#fdfcf9]">
                                        <div className="space-y-2">
                                            {graphData.nodes.map((node) => (
                                                <div key={node.id} className="rounded-md border border-[#e5e0d8] bg-[#f5f0eb]/30 p-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-sm font-medium text-[#3d3630]">{node.label}</p>
                                                        <Badge variant="secondary" className="bg-[#f0e6c8]/60 text-[#8b7355]">{node.type}</Badge>
                                                    </div>
                                                    <p className="mt-1 break-all text-xs text-[#8a8279]">{node.id}</p>
                                                    {Object.keys(node.properties).length > 0 && (
                                                        <div className="mt-2 grid gap-1">
                                                            {Object.entries(node.properties).map(([key, value]) => (
                                                                <p key={`${node.id}-${key}`} className="break-all text-xs text-[#8a8279]">
                                                                    <span className="font-medium text-[#3d3630]/80">{key}:</span>{" "}
                                                                    {value ?? "null"}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                <TabsContent value="edges" className="mt-3">
                                    <ScrollArea className="h-[55vh] rounded-md border border-[#e5e0d8] p-3 bg-[#fdfcf9]">
                                        <div className="space-y-2">
                                            {graphData.edges.map((edge, index) => (
                                                <div
                                                    key={`${edge.source}-${edge.type}-${edge.target}-${index}`}
                                                    className="rounded-md border border-[#e5e0d8] bg-[#f5f0eb]/30 p-3"
                                                >
                                                    <p className="break-all font-mono text-xs text-[#3d3630]">
                                                        {edge.source} -[{edge.type}]-&gt; {edge.target}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Content Preview Dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-hidden border-[#e5e0d8] bg-[#fdfcf9]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-[#3d3630]">
                            <ScrollText className="h-5 w-5 text-[#8b7355]" />
                            {previewDoc?.title}
                        </DialogTitle>
                        <DialogDescription className="text-[#8a8279]">
                            Document content preview
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] pr-4">
                        <div className="rounded-xl border border-[#e5e0d8] bg-[#faf6f1] p-4">
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#3d3630]">
                                {previewDoc?.content || "No content available."}
                            </p>
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
