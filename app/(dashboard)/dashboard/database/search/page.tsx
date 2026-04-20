import { SearchClient } from "./search-client";

export default function SearchPage() {
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Hybrid Search</h1>
                    <p className="text-muted-foreground">
                        Search vector data and private graph context from ingested reports
                    </p>
                </div>
            </div>
            <SearchClient />
        </div>
    );
}
