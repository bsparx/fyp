import { SearchClient } from "./search-client";

export default function SearchPage() {
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Vector Search</h1>
                    <p className="text-muted-foreground">
                        Search the vector database using semantic similarity
                    </p>
                </div>
            </div>
            <SearchClient />
        </div>
    );
}
