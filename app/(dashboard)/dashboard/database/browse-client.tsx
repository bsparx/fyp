"use client";

import * as React from "react";
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

    const filteredDocuments = React.useMemo(() => {
        let filtered = documents;

        // Filter by type
        if (typeFilter !== "ALL") {
            filtered = filtered.filter((doc) => doc.ragSubtype === typeFilter);
        }

        // Filter by search query
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
        try {
            const result = await deleteDocument(documentId);
            if (result.success) {
                setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
            }
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
        if (!pendingDeleteDoc) {
            return;
        }

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
            console.error(`Error loading ${domain} graph:`, error);
            setGraphError(`Failed to load the ${domain} graph.`);
        } finally {
            setIsGraphLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Documents</CardTitle>
                        <CardDescription>
                            {filteredDocuments.length} of {documents.length} document{documents.length !== 1 ? "s" : ""} in the database
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => void openDomainGraph("medicine")}
                            disabled={isGraphLoading}
                        >
                            <Network className="h-3.5 w-3.5" />
                            Medicine Graph
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => void openDomainGraph("disease")}
                            disabled={isGraphLoading}
                        >
                            <Network className="h-3.5 w-3.5" />
                            Disease Graph
                        </Button>
                        <Select value={typeFilter} onValueChange={(value: TypeFilter) => setTypeFilter(value)}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Filter by type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Types</SelectItem>
                                <SelectItem value="MEDICINE">
                                    <span className="flex items-center gap-2">
                                        <Pill className="h-3.5 w-3.5" />
                                        Medicine
                                    </span>
                                </SelectItem>
                                <SelectItem value="DISEASE">
                                    <span className="flex items-center gap-2">
                                        <Activity className="h-3.5 w-3.5" />
                                        Disease
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="relative w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Filter documents..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {filteredDocuments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground/50" />
                        <h3 className="mt-4 text-lg font-semibold">No documents found</h3>
                        <p className="text-sm text-muted-foreground">
                            {searchQuery
                                ? "Try a different search query"
                                : "Upload documents to get started"}
                        </p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[300px]">Title</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Parent Chunks</TableHead>
                                <TableHead className="text-right">RAG Chunks</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="w-[70px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDocuments.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <div className="font-medium">{truncateText(doc.title, 40)}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {truncateText(doc.content, 60)}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {doc.ragSubtype === "MEDICINE" ? (
                                            <Badge variant="outline" className="gap-1 text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800">
                                                <Pill className="h-3 w-3" />
                                                Medicine
                                            </Badge>
                                        ) : doc.ragSubtype === "DISEASE" ? (
                                            <Badge variant="outline" className="gap-1 text-purple-600 border-purple-300 bg-purple-50 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800">
                                                <Activity className="h-3 w-3" />
                                                Disease
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="gap-1">
                                                Unknown
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {doc.isIngested ? (
                                            <Badge variant="default" className="gap-1">
                                                <CheckCircle className="h-3 w-3" />
                                                Ingested
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="gap-1">
                                                <XCircle className="h-3 w-3" />
                                                Pending
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {doc._count.parentChunks}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {doc._count.ragChunks}
                                    </TableCell>
                                    <TableCell>{formatDate(doc.createdAt)}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Open menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onSelect={(event) => {
                                                        event.preventDefault();
                                                        void openDocumentGraph(doc);
                                                    }}
                                                >
                                                    <Network className="mr-2 h-4 w-4" />
                                                    View Graph
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onSelect={(event) => {
                                                        event.preventDefault();
                                                        setPendingDeleteDoc(doc);
                                                    }}
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
                )}
            </CardContent>

            <AlertDialog
                open={pendingDeleteDoc !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setPendingDeleteDoc(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Document</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{pendingDeleteDoc?.title}&quot;? This will permanently remove the
                            document, SQL parent chunks, graph data, and embeddings from the vector database.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={Boolean(isDeleting)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            disabled={!pendingDeleteDoc || isDeleting === pendingDeleteDoc.id}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
                    if (!open) {
                        setGraphError(null);
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-6xl overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>{graphTitle}</DialogTitle>
                        <DialogDescription>
                            Complete Neo4j graph view for this scope (all nodes and relationships currently connected).
                        </DialogDescription>
                    </DialogHeader>

                    {isGraphLoading ? (
                        <div className="flex min-h-[300px] items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Loading graph...
                        </div>
                    ) : graphError ? (
                        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                            {graphError}
                        </div>
                    ) : !graphData ? (
                        <div className="rounded-md border p-4 text-sm text-muted-foreground">
                            Select a graph to view.
                        </div>
                    ) : !graphData.enabled ? (
                        <div className="rounded-md border border-amber-400/40 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-300">
                            {graphData.message ?? "Neo4j is not configured in this environment."}
                        </div>
                    ) : !graphData.graphPresent ? (
                        <div className="rounded-md border p-4 text-sm text-muted-foreground">
                            {graphData.message ?? "No graph data found for this scope yet."}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">Nodes: {graphData.nodes.length}</Badge>
                                <Badge variant="outline">Relationships: {graphData.edges.length}</Badge>
                                {graphData.nodeTypeCounts.map((entry) => (
                                    <Badge key={entry.type} variant="secondary">
                                        {entry.type}: {entry.count}
                                    </Badge>
                                ))}
                            </div>

                            <Tabs defaultValue="nodes" className="w-full">
                                <TabsList>
                                    <TabsTrigger value="nodes">Nodes ({graphData.nodes.length})</TabsTrigger>
                                    <TabsTrigger value="edges">Relationships ({graphData.edges.length})</TabsTrigger>
                                </TabsList>

                                <TabsContent value="nodes" className="mt-3">
                                    <ScrollArea className="h-[55vh] rounded-md border p-3">
                                        <div className="space-y-2">
                                            {graphData.nodes.map((node) => (
                                                <div key={node.id} className="rounded-md border bg-muted/20 p-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-sm font-medium">{node.label}</p>
                                                        <Badge variant="secondary">{node.type}</Badge>
                                                    </div>
                                                    <p className="mt-1 break-all text-xs text-muted-foreground">{node.id}</p>
                                                    {Object.keys(node.properties).length > 0 && (
                                                        <div className="mt-2 grid gap-1">
                                                            {Object.entries(node.properties).map(([key, value]) => (
                                                                <p key={`${node.id}-${key}`} className="break-all text-xs text-muted-foreground">
                                                                    <span className="font-medium text-foreground/80">{key}:</span>{" "}
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
                                    <ScrollArea className="h-[55vh] rounded-md border p-3">
                                        <div className="space-y-2">
                                            {graphData.edges.map((edge, index) => (
                                                <div
                                                    key={`${edge.source}-${edge.type}-${edge.target}-${index}`}
                                                    className="rounded-md border bg-muted/20 p-3"
                                                >
                                                    <p className="break-all font-mono text-xs">
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
        </Card>
    );
}
