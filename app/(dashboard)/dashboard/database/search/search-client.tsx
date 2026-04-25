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
        if (score >= 0.8) return "bg-[#8fa68e]";
        if (score >= 0.6) return "bg-[#c49a6c]";
        return "bg-[#c4705a]";
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
                <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-[#3d3630]">
                            <Sparkles className="h-5 w-5 text-[#8b7355]" />
                            {retrievalMode === "hybrid" ? "Hybrid Search" : "Semantic Search"}
                        </CardTitle>
                        <CardDescription className="text-[#8a8279]">
                            {retrievalMode === "hybrid"
                                ? "Search vector chunks and structured clinical graph context in a single pass."
                                : "Search using natural language. Results are ranked by semantic similarity using Parent Document RAG with reranking."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSearch} className="flex flex-col gap-3">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8279]" />
                                    <Input
                                        type="search"
                                        placeholder="Enter your search query..."
                                        className="pl-9 bg-[#fdfcf9] border-[#e5e0d8] text-[#3d3630] placeholder:text-[#8a8279]/60"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        disabled={isSearching}
                                    />
                                </div>
                                <Button type="submit" disabled={isSearching || !query.trim()} className="bg-[#8b7355] hover:bg-[#6b5a42] text-white">
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
                                <span className="text-sm text-[#8a8279]">Mode:</span>
                                <Select value={retrievalMode} onValueChange={(value: RetrievalMode) => setRetrievalMode(value)}>
                                    <SelectTrigger className="w-[210px] border-[#e5e0d8] bg-[#fdfcf9] text-[#3d3630]">
                                        <SelectValue placeholder="Select mode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="vector">
                                            <span className="flex items-center gap-2 text-[#3d3630]">
                                                <Search className="h-3.5 w-3.5" />
                                                Vector Only
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="hybrid">
                                            <span className="flex items-center gap-2 text-[#3d3630]">
                                                <Network className="h-3.5 w-3.5 text-[#8fa68e]" />
                                                Hybrid (Vector + Graph)
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                <span className="text-sm text-[#8a8279]">Search in:</span>
                                <Select value={typeFilter} onValueChange={(value: SearchTypeFilter) => setTypeFilter(value)}>
                                    <SelectTrigger className="w-[180px] border-[#e5e0d8] bg-[#fdfcf9] text-[#3d3630]">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            <span className="flex items-center gap-2 text-[#3d3630]">All Documents</span>
                                        </SelectItem>
                                        <SelectItem value="medicine">
                                            <span className="flex items-center gap-2 text-[#3d3630]">
                                                <Pill className="h-3.5 w-3.5 text-[#7a9eaf]" />
                                                Medicine Only
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="disease">
                                            <span className="flex items-center gap-2 text-[#3d3630]">
                                                <Activity className="h-3.5 w-3.5 text-[#c49a6c]" />
                                                Disease Only
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                {typeFilter !== "all" && (
                                    <Badge variant="outline" className="gap-1 border-[#e5e0d8] text-[#3d3630]">
                                        {typeFilter === "medicine" ? (
                                            <><Pill className="h-3 w-3 text-[#7a9eaf]" /> Medicine</>
                                        ) : (
                                            <><Activity className="h-3 w-3 text-[#c49a6c]" /> Disease</>
                                        )}
                                    </Badge>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Results */}
                <Card className="flex-1 border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-[#3d3630]">Results</CardTitle>
                                <CardDescription className="text-[#8a8279]">
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
                                <Badge variant="outline" className="gap-1 border-[#e5e0d8] text-[#3d3630]">
                                    <Clock className="h-3 w-3" />
                                    {searchTime.toFixed(0)}ms
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isSearching ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8b7355] border-t-transparent" />
                                <p className="mt-4 text-sm text-[#8a8279]">
                                    {retrievalMode === "hybrid" ? "Searching vector and graph contexts..." : "Searching vector database..."}
                                </p>
                            </div>
                        ) : hasAnyResults ? (
                            <ScrollArea className="h-[calc(100vh-420px)] pr-4">
                                <div className="space-y-4">
                                    {retrievalMode === "hybrid" && graphContext && (
                                        <Card className="border-dashed border-[#e5e0d8] bg-[#fdfcf9]">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="flex items-center gap-2 text-base text-[#3d3630]">
                                                    <Network className="h-4 w-4 text-[#8fa68e]" />
                                                    Private Graph Context
                                                </CardTitle>
                                                <CardDescription className="text-[#8a8279]">
                                                    Built from structured patient report entities and relationships.
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="outline" className="border-[#e5e0d8] text-[#3d3630]">Patients: {graphContext.stats.patients}</Badge>
                                                    <Badge variant="outline" className="border-[#e5e0d8] text-[#3d3630]">Reports: {graphContext.stats.reports}</Badge>
                                                    <Badge variant="outline" className="border-[#e5e0d8] text-[#3d3630]">Observations: {graphContext.stats.observations}</Badge>
                                                    <Badge variant="outline" className="border-[#e5e0d8] text-[#3d3630]">Metrics: {graphContext.stats.metrics}</Badge>
                                                </div>
                                                {graphContext.queryTerms.length > 0 && (
                                                    <p className="text-xs text-[#8a8279]">
                                                        Matched terms: {graphContext.queryTerms.join(", ")}
                                                    </p>
                                                )}
                                                {graphContext.evidence.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {graphContext.evidence.slice(0, 8).map((ev) => (
                                                            <div key={ev.id} className="rounded-md border border-[#e5e0d8] bg-[#fdfcf9] p-3">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <p className="text-sm font-medium text-[#3d3630]">{ev.keyNormalized ?? ev.key}</p>
                                                                    <Badge variant="secondary" className="font-mono bg-[#f5f0eb] text-[#3d3630]">
                                                                        {ev.value}{ev.unit ? ` ${ev.unit}` : ""}
                                                                    </Badge>
                                                                </div>
                                                                <p className="mt-1 text-xs text-[#8a8279]">
                                                                    {(ev.patientName ?? ev.patientId) + " • "}
                                                                    {(ev.hospitalName ?? "Unknown hospital") + " • "}
                                                                    {ev.reportDate ? new Date(ev.reportDate).toLocaleDateString() : "Unknown date"}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-[#8a8279]">No graph evidence matched this query.</p>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {results.length === 0 && retrievalMode === "hybrid" && (
                                        <Card className="border-dashed border-[#e5e0d8] bg-[#fdfcf9]">
                                            <CardContent className="pt-6 text-sm text-[#8a8279]">
                                                No vector chunks matched, but graph evidence was found.
                                            </CardContent>
                                        </Card>
                                    )}

                                    {results.map((result, index) => {
                                        const { truncated, isTruncated } = truncateToLines(result.parentText, 5);
                                        return (
                                            <Dialog key={result.parentChunkId}>
                                                <Card className="overflow-hidden border-[#e5e0d8] bg-[#fdfcf9] hover:border-[#c4a882]/40 transition-colors">
                                                    <div className="flex">
                                                        <div className="flex w-12 shrink-0 items-center justify-center bg-[#f5f0eb] text-lg font-bold text-[#3d3630]">
                                                            #{index + 1}
                                                        </div>
                                                        <div className="flex-1 p-4">
                                                            <div className="mb-2 flex items-start justify-between gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <FileText className="h-4 w-4 text-[#8a8279]" />
                                                                    <span className="font-medium text-[#3d3630]">{result.documentTitle}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Progress value={result.score * 100} className={`h-2 w-16 ${getScoreColor(result.score)}`} />
                                                                    <span className="text-sm font-medium text-[#3d3630]">{formatScore(result.score)}</span>
                                                                </div>
                                                            </div>
                                                            <Separator className="my-2 bg-[#e5e0d8]" />
                                                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#8a8279] line-clamp-5">
                                                                {truncated}
                                                            </p>
                                                            {isTruncated && (
                                                                <DialogTrigger asChild>
                                                                    <Button variant="link" className="mt-2 h-auto p-0 text-[#8b7355]">
                                                                        Read more <ChevronRight className="ml-1 h-4 w-4" />
                                                                    </Button>
                                                                </DialogTrigger>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Card>
                                                <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden border-[#e5e0d8] bg-[#fdfcf9]">
                                                    <DialogHeader>
                                                        <DialogTitle className="flex items-center gap-2 text-[#3d3630]">
                                                            <FileText className="h-5 w-5 text-[#8b7355]" />
                                                            {result.documentTitle}
                                                        </DialogTitle>
                                                        <DialogDescription className="text-[#8a8279]">
                                                            Score: {formatScore(result.score)}
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <ScrollArea className="max-h-[60vh] pr-4">
                                                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#3d3630]">
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
                                <Search className="h-12 w-12 text-[#8a8279]/40" />
                                <h3 className="mt-4 text-lg font-semibold text-[#3d3630]">No results found</h3>
                                <p className="text-sm text-[#8a8279]">Try a different search query or check if documents have been ingested</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <Search className="h-12 w-12 text-[#8a8279]/40" />
                                <h3 className="mt-4 text-lg font-semibold text-[#3d3630]">Ready to search</h3>
                                <p className="text-sm text-[#8a8279]">Enter a query above to search the vector database</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Sidebar */}
            <div className="flex flex-col gap-4">
                {recentSearches.length > 0 && (
                    <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base text-[#3d3630] flex items-center gap-2">
                                    <History className="size-4 text-[#8b7355]" />
                                    Recent Searches
                                </CardTitle>
                                <button onClick={clearRecent} className="text-[10px] text-[#8a8279] hover:text-[#c4705a] uppercase tracking-wider">
                                    Clear
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            {recentSearches.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => { setQuery(s); }}
                                    className="w-full text-left text-sm text-[#3d3630] hover:text-[#8b7355] hover:bg-[#f5f0eb] rounded-md px-2 py-1.5 transition-colors truncate"
                                >
                                    {s}
                                </button>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base text-[#3d3630]">How it works</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-[#8a8279]">
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

                <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base text-[#3d3630]">Score Interpretation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-[#8fa68e]" />
                            <span className="text-[#3d3630]">80%+ - Highly relevant</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-[#c49a6c]" />
                            <span className="text-[#3d3630]">60-80% - Moderately relevant</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-[#c4705a]" />
                            <span className="text-[#3d3630]">&lt;60% - Loosely related</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-[#e5e0d8] bg-[#fdfcf9] shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base text-[#3d3630]">Tips</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-[#8a8279]">
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
