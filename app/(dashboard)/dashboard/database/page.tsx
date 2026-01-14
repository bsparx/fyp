import { getDocuments } from "./actions";
import { BrowseDocumentsClient } from "./browse-client";

export default async function DatabaseBrowsePage() {
    const documents = await getDocuments();

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Browse Documents</h1>
                    <p className="text-muted-foreground">
                        View and manage all embedded documents in the vector database
                    </p>
                </div>
            </div>
            <BrowseDocumentsClient documents={documents} />
        </div>
    );
}
