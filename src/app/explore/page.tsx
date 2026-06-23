import { ExploreClient } from "./ExploreClient";

export const metadata = {
  title: "Explore Stocks | InvestIQ",
  description: "Browse, filter, and discover stock opportunities.",
};

export default function ExplorePage() {
  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Explore Stocks</h1>
        <p className="text-muted-foreground">
          Discover all stocks tracked in our database. Use the search and filters below to find your next investment.
        </p>
      </div>
      <ExploreClient />
    </div>
  );
}
