"use client";

import * as React from "react";
import { FileText, Trash2, CheckCircle, XCircle, Search, MoreHorizontal, Pill, Activity } from "lucide-react";
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
    AlertDialogTrigger,
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
import { deleteDocument, type DocumentWithStats } from "./actions";

type TypeFilter = "ALL" | "MEDICINE" | "DISEASE";

interface BrowseDocumentsClientProps {
    documents: DocumentWithStats[];
}

export function BrowseDocumentsClient({ documents: initialDocuments }: BrowseDocumentsClientProps) {
    const [documents, setDocuments] = React.useState(initialDocuments);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("ALL");
    const [isDeleting, setIsDeleting] = React.useState<string | null>(null);

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
                                        <AlertDialog>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Open menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem className="text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to delete &quot;{doc.title}&quot;? This will
                                                        permanently remove the document and all its embeddings from the
                                                        vector database.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDelete(doc.id)}
                                                        disabled={isDeleting === doc.id}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        {isDeleting === doc.id ? "Deleting..." : "Delete"}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
