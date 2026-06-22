import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WatchlistService } from "@/services/watchlistService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreateWatchlistButton } from "./_components/CreateWatchlistButton";

export default async function WatchlistsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  const watchlists = await WatchlistService.getUserWatchlists(session.user.id);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Watchlists</h1>
          <p className="text-muted-foreground">Manage and track your custom stock lists.</p>
        </div>
        <CreateWatchlistButton />
      </div>

      {watchlists.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 border-dashed">
          <CardHeader className="text-center">
            <CardTitle>No Watchlists Found</CardTitle>
            <CardDescription>You haven't created any watchlists yet. Create one to start tracking stocks.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {watchlists.map((watchlist) => (
            <Card key={watchlist.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{watchlist.name}</CardTitle>
                <CardDescription>{watchlist.description || "No description provided."}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Stocks ({watchlist.watchlistStocks.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {watchlist.watchlistStocks.slice(0, 5).map((ws) => (
                      <Link key={ws.id} href={`/stocks/${ws.stock.ticker}`}>
                        <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
                          {ws.stock.ticker}
                        </span>
                      </Link>
                    ))}
                    {watchlist.watchlistStocks.length > 5 && (
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                        +{watchlist.watchlistStocks.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0 mt-auto">
                <Link href={`/watchlists/${watchlist.id}`}>
                  <Button variant="outline" className="w-full">View Full List</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
