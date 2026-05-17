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
        <Card className="border-[#d0d9e8] bg-[#ffffff] shadow-sm">
            <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="text-[#1e2a3a]">Documents</CardTitle>
                        <CardDescription className="text-[#6b7d99]">
                            {filteredDocuments.length} of {documents.length} document{documents.length !== 1 ? "s" : ""} in the database
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 border-[#d0d9e8] text-[#1e2a3a] hover:bg-[#dbe4f5]/30"
                            onClick={() => void openDomainGraph("medicine")}
                            disabled={isGraphLoading}
                        >
                            <Network className="h-3.5 w-3.5 text-[#38bdf8]" />
                            Medicine Graph
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 border-[#d0d9e8] text-[#1e2a3a] hover:bg-[#dbe4f5]/30"
                            onClick={() => void openDomainGraph("disease")}
                            disabled={isGraphLoading}
                        >
                            <Network className="h-3.5 w-3.5 text-[#8aa4f0]" />
                            Disease Graph
                        </Button>
                        <Select value={typeFilter} onValueChange={(value: TypeFilter) => setTypeFilter(value)}>
                            <SelectTrigger className="w-[140px] border-[#d0d9e8] bg-[#ffffff]">
                                <SelectValue placeholder="Filter by type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Types</SelectItem>
                                <SelectItem value="MEDICINE">
                                    <span className="flex items-center gap-2 text-[#1e2a3a]">
                                        <Pill className="h-3.5 w-3.5 text-[#38bdf8]" />
                                        Medicine
                                    </span>
                                </SelectItem>
                                <SelectItem value="DISEASE">
                                    <span className="flex items-center gap-2 text-[#1e2a3a]">
                                        <Activity className="h-3.5 w-3.5 text-[#8aa4f0]" />
                                        Disease
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#6b7d99]" />
                            <Input
                                type="search"
                                placeholder="Filter documents..."
                                className="pl-8 border-[#d0d9e8] bg-[#ffffff] text-[#1e2a3a] placeholder:text-[#6b7d99]/60"
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
                        <FileText className="h-12 w-12 text-[#6b7d99]/40 mb-4" />
                        <h3 className="text-lg font-semibold text-[#1e2a3a]">No documents found</h3>
                        <p className="text-sm text-[#6b7d99] mt-1">
                            {searchQuery ? "Try a different search query" : "Upload documents to get started"}
                        </p>
                    </div>
                ) : (
                    <div className="rounded-xl border border-[#d0d9e8] overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-[#d0d9e8] hover:bg-transparent bg-[#e3e8f2]/50">
                                    <TableHead className="text-[#6b7d99] font-medium">Title</TableHead>
                                    <TableHead className="text-[#6b7d99] font-medium">Type</TableHead>
                                    <TableHead className="text-[#6b7d99] font-medium">Status</TableHead>
                                    <TableHead className="text-[#6b7d99] font-medium text-right">Parent Chunks</TableHead>
                                    <TableHead className="text-[#6b7d99] font-medium text-right">RAG Chunks</TableHead>
                                    <TableHead className="text-[#6b7d99] font-medium">Created</TableHead>
                                    <TableHead className="w-[70px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDocuments.map((doc) => (
                                    <TableRow key={doc.id} className="border-[#d0d9e8]/60 hover:bg-[#e3e8f2]/50 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="rounded-lg bg-[#dbe4f5]/40 p-2 shrink-0">
                                                    <FileText className="h-4 w-4 text-[#5b7cfa]" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-[#1e2a3a]">{truncateText(doc.title, 40)}</div>
                                                    <div className="text-xs text-[#6b7d99]">
                                                        {truncateText(doc.content, 60)}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {doc.ragSubtype === "MEDICINE" ? (
                                                <Badge variant="outline" className="gap-1 text-[#38bdf8] border-[#38bdf8]/30 bg-[#38bdf8]/10">
                                                    <Pill className="h-3 w-3" />
                                                    Medicine
                                                </Badge>
                                            ) : doc.ragSubtype === "DISEASE" ? (
                                                <Badge variant="outline" className="gap-1 text-[#8aa4f0] border-[#8aa4f0]/30 bg-[#8aa4f0]/10">
                                                    <Activity className="h-3 w-3" />
                                                    Disease
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[#6b7d99] border-[#d0d9e8]">Unknown</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {doc.isIngested ? (
                                                <Badge variant="outline" className="gap-1 text-[#4ade80] border-[#4ade80]/30 bg-[#4ade80]/10">
                                                    <CheckCircle className="h-3 w-3" />
                                                    Ingested
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="gap-1 text-[#8aa4f0] border-[#8aa4f0]/30 bg-[#8aa4f0]/10">
                                                    <XCircle className="h-3 w-3" />
                                                    Pending
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-[#1e2a3a]">
                                            {doc._count.parentChunks}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-[#1e2a3a]">
                                            {doc._count.ragChunks}
                                        </TableCell>
                                        <TableCell className="text-[#6b7d99]">{formatDate(doc.createdAt)}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6b7d99] hover:text-[#1e2a3a] hover:bg-[#dbe4f5]/30" aria-label="Open actions menu">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Open menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onSelect={(event) => { event.preventDefault(); void openDocumentGraph(doc); }}>
                                                        <Network className="mr-2 h-4 w-4 text-[#38bdf8]" />
                                                        View Graph
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onSelect={(event) => { event.preventDefault(); setPreviewDoc(doc); setPreviewOpen(true); }}
                                                    >
                                                        <Eye className="mr-2 h-4 w-4 text-[#38bdf8]" />
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
                <AlertDialogContent className="border-[#d0d9e8] bg-[#ffffff]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-[#1e2a3a]">Delete Document</AlertDialogTitle>
                        <AlertDialogDescription className="text-[#6b7d99]">
                            Are you sure you want to delete <strong className="text-[#1e2a3a]">&quot;{pendingDeleteDoc?.title}&quot;</strong>? This will permanently remove the
                            document, SQL parent chunks, graph data, and embeddings from the vector database.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={Boolean(isDeleting)} className="border-[#d0d9e8]">Cancel</AlertDialogCancel>
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
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-6xl overflow-hidden border-[#d0d9e8] bg-[#ffffff]">
                    <DialogHeader>
                        <DialogTitle className="text-[#1e2a3a]">{graphTitle}</DialogTitle>
                        <DialogDescription className="text-[#6b7d99]">
                            Complete Neo4j graph view for this scope.
                        </DialogDescription>
                    </DialogHeader>

                    {isGraphLoading ? (
                        <div className="flex min-h-[300px] items-center justify-center gap-2 text-[#6b7d99]">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Loading graph...
                        </div>
                    ) : graphError ? (
                        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            {graphError}
                        </div>
                    ) : !graphData ? (
                        <div className="rounded-md border border-[#d0d9e8] p-4 text-sm text-[#6b7d99]">
                            Select a graph to view.
                        </div>
                    ) : !graphData.enabled ? (
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                            {graphData.message ?? "Neo4j is not configured in this environment."}
                        </div>
                    ) : !graphData.graphPresent ? (
                        <div className="rounded-md border border-[#d0d9e8] p-4 text-sm text-[#6b7d99]">
                            {graphData.message ?? "No graph data found for this scope yet."}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="border-[#d0d9e8] text-[#1e2a3a]">Nodes: {graphData.nodes.length}</Badge>
                                <Badge variant="outline" className="border-[#d0d9e8] text-[#1e2a3a]">Relationships: {graphData.edges.length}</Badge>
                                {graphData.nodeTypeCounts.map((entry) => (
                                    <Badge key={entry.type} variant="secondary" className="bg-[#e3e8f2] text-[#1e2a3a]">
                                        {entry.type}: {entry.count}
                                    </Badge>
                                ))}
                            </div>

                            <Tabs defaultValue="graph" className="w-full">
                                <TabsList className="bg-[#e3e8f2]">
                                    <TabsTrigger value="graph" className="data-[state=active]:bg-[#ffffff] data-[state=active]:text-[#1e2a3a]">
                                        <Network className="size-3 mr-1.5" />
                                        Graph
                                    </TabsTrigger>
                                    <TabsTrigger value="nodes" className="data-[state=active]:bg-[#ffffff] data-[state=active]:text-[#1e2a3a]">Nodes ({graphData.nodes.length})</TabsTrigger>
                                    <TabsTrigger value="edges" className="data-[state=active]:bg-[#ffffff] data-[state=active]:text-[#1e2a3a]">Relationships ({graphData.edges.length})</TabsTrigger>
                                </TabsList>

                                <TabsContent value="graph" className="mt-3">
                                    <GraphVisualization graphData={graphData} height={520} />
                                </TabsContent>

                                <TabsContent value="nodes" className="mt-3">
                                    <ScrollArea className="h-[55vh] rounded-md border border-[#d0d9e8] p-3 bg-[#ffffff]">
                                        <div className="space-y-2">
                                            {graphData.nodes.map((node) => (
                                                <div key={node.id} className="rounded-md border border-[#d0d9e8] bg-[#e3e8f2]/30 p-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-sm font-medium text-[#1e2a3a]">{node.label}</p>
                                                        <Badge variant="secondary" className="bg-[#dbe4f5]/60 text-[#5b7cfa]">{node.type}</Badge>
                                                    </div>
                                                    <p className="mt-1 break-all text-xs text-[#6b7d99]">{node.id}</p>
                                                    {Object.keys(node.properties).length > 0 && (
                                                        <div className="mt-2 grid gap-1">
                                                            {Object.entries(node.properties).map(([key, value]) => (
                                                                <p key={`${node.id}-${key}`} className="break-all text-xs text-[#6b7d99]">
                                                                    <span className="font-medium text-[#1e2a3a]/80">{key}:</span>{" "}
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
                                    <ScrollArea className="h-[55vh] rounded-md border border-[#d0d9e8] p-3 bg-[#ffffff]">
                                        <div className="space-y-2">
                                            {graphData.edges.map((edge, index) => (
                                                <div
                                                    key={`${edge.source}-${edge.type}-${edge.target}-${index}`}
                                                    className="rounded-md border border-[#d0d9e8] bg-[#e3e8f2]/30 p-3"
                                                >
                                                    <p className="break-all font-mono text-xs text-[#1e2a3a]">
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
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-hidden border-[#d0d9e8] bg-[#ffffff]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-[#1e2a3a]">
                            <ScrollText className="h-5 w-5 text-[#5b7cfa]" />
                            {previewDoc?.title}
                        </DialogTitle>
                        <DialogDescription className="text-[#6b7d99]">
                            Document content preview
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] pr-4">
                        <div className="rounded-xl border border-[#d0d9e8] bg-[#eef2f7] p-4">
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#1e2a3a]">
                                {previewDoc?.content || "No content available."}
                            </p>
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
