import { getDatabaseStats } from "../actions";
import { StatsClient } from "./stats-client";

export default async function StatsPage() {
    const stats = await getDatabaseStats();

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Database Statistics</h1>
                    <p className="text-muted-foreground">
                        Overview of your vector database metrics and performance
                    </p>
                </div>
            </div>
            <StatsClient stats={stats} />
        </div>
    );
}
