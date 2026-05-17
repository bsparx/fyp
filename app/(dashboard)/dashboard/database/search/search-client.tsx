"use client";

import * as React from "react";
import {
    Search,
    FileText,
    Sparkles,
    Clock,
    ChevronRight,
    Pill,
    Activity,
    Network,
    History,
    X,
} from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    searchHybridDatabase,
    searchVectorDatabase,
    type ParentSearchResult,
    type HybridGraphContext,
} from "../actions";

type SearchTypeFilter = "all" | "medicine" | "disease";
type RetrievalMode = "vector" | "hybrid";

export function SearchClient() {
    const [query, setQuery] = React.useState("");
    const [typeFilter, setTypeFilter] = React.useState<SearchTypeFilter>("all");
    const [retrievalMode, setRetrievalMode] = React.useState<RetrievalMode>("vector");
    const [results, setResults] = React.useState<ParentSearchResult[]>([]);
    const [graphContext, setGraphContext] = React.useState<HybridGraphContext | null>(null);
    const [isSearching, setIsSearching] = React.useState(false);
    const [searchTime, setSearchTime] = React.useState<number | null>(null);
    const [hasSearched, setHasSearched] = React.useState(false);
    const [recentSearches, setRecentSearches] = React.useState<string[]>([]);

    React.useEffect(() => {
        try {
            const saved = localStorage.getItem("hms_recent_searches");
            if (saved) setRecentSearches(JSON.parse(saved));
        } catch { /* ignore */ }
    }, []);

    const saveSearch = React.useCallback((q: string) => {
        setRecentSearches((prev) => {
            const next = [q, ...prev.filter((s) => s !== q)].slice(0, 8);
            try { localStorage.setItem("hms_recent_searches", JSON.stringify(next)); } catch { /* ignore */ }
            return next;
        });
    }, []);

    const clearRecent = () => {
        setRecentSearches([]);
        try { localStorage.removeItem("hms_recent_searches"); } catch { /* ignore */ }
    };

    const hasAnyResults =
        results.length > 0 ||
        (retrievalMode === "hybrid" && (graphContext?.evidence.length ?? 0) > 0);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        saveSearch(query.trim());
        setIsSearching(true);
        setHasSearched(true);
        const startTime = performance.now();

        try {
            if (retrievalMode === "hybrid") {
                const hybridResults = await searchHybridDatabase(query, 50, typeFilter, "");
                setResults(hybridResults.vectorResults);
                setGraphContext(hybridResults.graphContext);
            } else {
                const searchResults = await searchVectorDatabase(query, 50, typeFilter);
                setResults(searchResults);
                setGraphContext(null);
            }
            setSearchTime(performance.now() - startTime);
        } catch (error) {
            console.error("Search error:", error);
            setResults([]);
            setGraphContext(null);
        } finally {
            setIsSearching(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 0.8) return "bg-[#4ade80]";
        if (score >= 0.6) return "bg-[#8aa4f0]";
        return "bg-[#e74c3c]";
    };

    const formatScore = (score: number) => {
        return (score * 100).toFixed(1) + "%";
    };

    const truncateToLines = (text: string, maxLines: number = 5) => {
        const lines = text.split("\n");
        if (lines.length <= maxLines) return { truncated: text, isTruncated: false };
        return { truncated: lines.slice(0, maxLines).join("\n") + "...", isTruncated: true };
    };

    return (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Main search area */}
            <div className="flex flex-col gap-6">
                <Card className="border-[#d0d9e8] bg-[#ffffff] shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-[#1e2a3a]">
                            <Sparkles className="h-5 w-5 text-[#5b7cfa]" />
                            {retrievalMode === "hybrid" ? "Hybrid Search" : "Semantic Search"}
                        </CardTitle>
                        <CardDescription className="text-[#6b7d99]">
                            {retrievalMode === "hybrid"
                                ? "Search vector chunks and structured clinical graph context in a single pass."
                                : "Search using natural language. Results are ranked by semantic similarity using Parent Document RAG with reranking."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSearch} className="flex flex-col gap-3">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7d99]" />
                                    <Input
                                        type="search"
                                        placeholder="Enter your search query..."
                                        className="pl-9 bg-[#ffffff] border-[#d0d9e8] text-[#1e2a3a] placeholder:text-[#6b7d99]/60"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        disabled={isSearching}
                                    />
                                </div>
                                <Button type="submit" disabled={isSearching || !query.trim()} className="bg-[#5b7cfa] hover:bg-[#4a5fd9] text-white">
                                    {isSearching ? (
                                        <>
                                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            Searching...
                                        </>
                                    ) : (
                                        "Search"
                                    )}
                                </Button>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm text-[#6b7d99]">Mode:</span>
                                <Select value={retrievalMode} onValueChange={(value: RetrievalMode) => setRetrievalMode(value)}>
                                    <SelectTrigger className="w-[210px] border-[#d0d9e8] bg-[#ffffff] text-[#1e2a3a]">
                                        <SelectValue placeholder="Select mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="vector">
                                            <span className="flex items-center gap-2 text-[#1e2a3a]">
                                                <Search className="h-3.5 w-3.5" />
                                                Vector Only
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="hybrid">
                                            <span className="flex items-center gap-2 text-[#1e2a3a]">
                                                <Network className="h-3.5 w-3.5 text-[#4ade80]" />
                                                Hybrid (Vector + Graph)
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                <span className="text-sm text-[#6b7d99]">Search in:</span>
                                <Select value={typeFilter} onValueChange={(value: SearchTypeFilter) => setTypeFilter(value)}>
                                    <SelectTrigger className="w-[180px] border-[#d0d9e8] bg-[#ffffff] text-[#1e2a3a]">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            <span className="flex items-center gap-2 text-[#1e2a3a]">All Documents</span>
                                        </SelectItem>
                                        <SelectItem value="medicine">
                                            <span className="flex items-center gap-2 text-[#1e2a3a]">
                                                <Pill className="h-3.5 w-3.5 text-[#38bdf8]" />
                                                Medicine Only
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="disease">
                                            <span className="flex items-center gap-2 text-[#1e2a3a]">
                                                <Activity className="h-3.5 w-3.5 text-[#8aa4f0]" />
                                                Disease Only
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                {typeFilter !== "all" && (
                                    <Badge variant="outline" className="gap-1 border-[#d0d9e8] text-[#1e2a3a]">
                                        {typeFilter === "medicine" ? (
                                            <><Pill className="h-3 w-3 text-[#38bdf8]" /> Medicine</>
                                        ) : (
                                            <><Activity className="h-3 w-3 text-[#8aa4f0]" /> Disease</>
                                        )}
                                    </Badge>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Results */}
                <Card className="flex-1 border-[#d0d9e8] bg-[#ffffff] shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-[#1e2a3a]">Results</CardTitle>
                                <CardDescription className="text-[#6b7d99]">
                                    {hasSearched
                                        ? hasAnyResults
                                            ? retrievalMode === "hybrid"
                                                ? `Vector hits: ${results.length} • Graph evidence: ${graphContext?.evidence.length ?? 0}`
                                                : `Top ${results.length} parent chunks ranked by relevance`
                                            : "No results found"
                                        : "Enter a query to search"}
                                </CardDescription>
                            </div>
                            {searchTime !== null && (
                                <Badge variant="outline" className="gap-1 border-[#d0d9e8] text-[#1e2a3a]">
                                    <Clock className="h-3 w-3" />
                                    {searchTime.toFixed(0)}ms
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isSearching ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5b7cfa] border-t-transparent" />
                                <p className="mt-4 text-sm text-[#6b7d99]">
                                    {retrievalMode === "hybrid" ? "Searching vector and graph contexts..." : "Searching vector database..."}
                                </p>
                            </div>
                        ) : hasAnyResults ? (
                            <ScrollArea className="h-[calc(100vh-420px)] pr-4">
                                <div className="space-y-4">
                                    {retrievalMode === "hybrid" && graphContext && (
                                        <Card className="border-dashed border-[#d0d9e8] bg-[#ffffff]">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="flex items-center gap-2 text-base text-[#1e2a3a]">
                                                    <Network className="h-4 w-4 text-[#4ade80]" />
                                                    Private Graph Context
                                                </CardTitle>
                                                <CardDescription className="text-[#6b7d99]">
                                                    Built from structured patient report entities and relationships.
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="outline" className="border-[#d0d9e8] text-[#1e2a3a]">Patients: {graphContext.stats.patients}</Badge>
                                                    <Badge variant="outline" className="border-[#d0d9e8] text-[#1e2a3a]">Reports: {graphContext.stats.reports}</Badge>
                                                    <Badge variant="outline" className="border-[#d0d9e8] text-[#1e2a3a]">Observations: {graphContext.stats.observations}</Badge>
                                                    <Badge variant="outline" className="border-[#d0d9e8] text-[#1e2a3a]">Metrics: {graphContext.stats.metrics}</Badge>
                                                </div>
                                                {graphContext.queryTerms.length > 0 && (
                                                    <p className="text-xs text-[#6b7d99]">
                                                        Matched terms: {graphContext.queryTerms.join(", ")}
                                                    </p>
                                                )}
                                                {graphContext.evidence.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {graphContext.evidence.slice(0, 8).map((ev) => (
                                                            <div key={ev.id} className="rounded-md border border-[#d0d9e8] bg-[#ffffff] p-3">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <p className="text-sm font-medium text-[#1e2a3a]">{ev.keyNormalized ?? ev.key}</p>
                                                                    <Badge variant="secondary" className="font-mono bg-[#e3e8f2] text-[#1e2a3a]">
                                                                        {ev.value}{ev.unit ? ` ${ev.unit}` : ""}
                                                                    </Badge>
                                                                </div>
                                                                <p className="mt-1 text-xs text-[#6b7d99]">
                                                                    {(ev.patientName ?? ev.patientId) + " • "}
                                                                    {(ev.hospitalName ?? "Unknown hospital") + " • "}
                                                                    {ev.reportDate ? new Date(ev.reportDate).toLocaleDateString() : "Unknown date"}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-[#6b7d99]">No graph evidence matched this query.</p>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {results.length === 0 && retrievalMode === "hybrid" && (
                                        <Card className="border-dashed border-[#d0d9e8] bg-[#ffffff]">
                                            <CardContent className="pt-6 text-sm text-[#6b7d99]">
                                                No vector chunks matched, but graph evidence was found.
                                            </CardContent>
                                        </Card>
                                    )}

                                    {results.map((result, index) => {
                                        const { truncated, isTruncated } = truncateToLines(result.parentText, 5);
                                        return (
                                            <Dialog key={result.parentChunkId}>
                                                <Card className="overflow-hidden border-[#d0d9e8] bg-[#ffffff] hover:border-[#8aa4f0]/40 transition-colors">
                                                    <div className="flex">
                                                        <div className="flex w-12 shrink-0 items-center justify-center bg-[#e3e8f2] text-lg font-bold text-[#1e2a3a]">
                                                            #{index + 1}
                                                        </div>
                                                        <div className="flex-1 p-4">
                                                            <div className="mb-2 flex items-start justify-between gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <FileText className="h-4 w-4 text-[#6b7d99]" />
                                                                    <span className="font-medium text-[#1e2a3a]">{result.documentTitle}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Progress value={result.score * 100} className={`h-2 w-16 ${getScoreColor(result.score)}`} />
                                                                    <span className="text-sm font-medium text-[#1e2a3a]">{formatScore(result.score)}</span>
                                                                </div>
                                                            </div>
                                                            <Separator className="my-2 bg-[#d0d9e8]" />
                                                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#6b7d99] line-clamp-5">
                                                                {truncated}
                                                            </p>
                                                            {isTruncated && (
                                                                <DialogTrigger asChild>
                                                                    <Button variant="link" className="mt-2 h-auto p-0 text-[#5b7cfa]">
                                                                        Read more <ChevronRight className="ml-1 h-4 w-4" />
                                                                    </Button>
                                                                </DialogTrigger>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Card>
                                                <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden border-[#d0d9e8] bg-[#ffffff]">
                                                    <DialogHeader>
                                                        <DialogTitle className="flex items-center gap-2 text-[#1e2a3a]">
                                                            <FileText className="h-5 w-5 text-[#5b7cfa]" />
                                                            {result.documentTitle}
                                                        </DialogTitle>
                                                        <DialogDescription className="text-[#6b7d99]">
                                                            Score: {formatScore(result.score)}
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <ScrollArea className="max-h-[60vh] pr-4">
                                                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#1e2a3a]">
                                                            {result.parentText}
                                                        </p>
                                                    </ScrollArea>
                                                </DialogContent>
                                            </Dialog>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        ) : hasSearched ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <Search className="h-12 w-12 text-[#6b7d99]/40" />
                                <h3 className="mt-4 text-lg font-semibold text-[#1e2a3a]">No results found</h3>
                                <p className="text-sm text-[#6b7d99]">Try a different search query or check if documents have been ingested</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <Search className="h-12 w-12 text-[#6b7d99]/40" />
                                <h3 className="mt-4 text-lg font-semibold text-[#1e2a3a]">Ready to search</h3>
                                <p className="text-sm text-[#6b7d99]">Enter a query above to search the vector database</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Sidebar */}
            <div className="flex flex-col gap-4">
                {recentSearches.length > 0 && (
                    <Card className="border-[#d0d9e8] bg-[#ffffff] shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base text-[#1e2a3a] flex items-center gap-2">
                                    <History className="size-4 text-[#5b7cfa]" />
                                    Recent Searches
                                </CardTitle>
                                <button onClick={clearRecent} className="text-[10px] text-[#6b7d99] hover:text-[#e74c3c] uppercase tracking-wider">
                                    Clear
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            {recentSearches.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => { setQuery(s); }}
                                    className="w-full text-left text-sm text-[#1e2a3a] hover:text-[#5b7cfa] hover:bg-[#e3e8f2] rounded-md px-2 py-1.5 transition-colors truncate"
                                >
                                    {s}
                                </button>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <Card className="border-[#d0d9e8] bg-[#ffffff] shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base text-[#1e2a3a]">How it works</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-[#6b7d99]">
                        {retrievalMode === "hybrid" ? (
                            <ol className="list-inside list-decimal space-y-2">
                                <li>Your query is used for semantic vector retrieval</li>
                                <li>Matching structured report rows are fetched as graph evidence</li>
                                <li>Entities are linked as Patient → Report → Observation → Metric</li>
                                <li>Vector parent chunks are reranked for final relevance</li>
                                <li>Both contexts are shown together for hybrid inspection</li>
                            </ol>
                        ) : (
                            <ol className="list-inside list-decimal space-y-2">
                                <li>Your query is converted to a vector embedding</li>
                                <li>Child chunks are retrieved based on similarity</li>
                                <li>Results are aggregated by parent chunks</li>
                                <li>Parents are reranked using Reciprocal Rank Fusion</li>
                                <li>Top parent chunks are returned with scores</li>
                            </ol>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-[#d0d9e8] bg-[#ffffff] shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base text-[#1e2a3a]">Score Interpretation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-[#4ade80]" />
                            <span className="text-[#1e2a3a]">80%+ - Highly relevant</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-[#8aa4f0]" />
                            <span className="text-[#1e2a3a]">60-80% - Moderately relevant</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-[#e74c3c]" />
                            <span className="text-[#1e2a3a]">&lt;60% - Loosely related</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-[#d0d9e8] bg-[#ffffff] shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base text-[#1e2a3a]">Tips</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-[#6b7d99]">
                        <ul className="list-inside list-disc space-y-2">
                            <li>Use natural language questions</li>
                            <li>Be specific about what you&apos;re looking for</li>
                            <li>Results are reranked by relevance to your query</li>
                            <li>Higher scores indicate better relevance</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
