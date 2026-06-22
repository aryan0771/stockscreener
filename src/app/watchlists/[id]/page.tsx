import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { WatchlistService } from "@/services/watchlistService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Trash, ArrowLeft } from "lucide-react";
import { RemoveStockButton } from "../_components/RemoveStockButton";

export default async function WatchlistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  const watchlists = await WatchlistService.getUserWatchlists(session.user.id);
  const watchlist = watchlists.find((w) => w.id === id);

  if (!watchlist) {
    notFound();
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/watchlists">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{watchlist.name}</h1>
          <p className="text-muted-foreground">{watchlist.description || "No description provided."}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stocks in {watchlist.name}</CardTitle>
          <CardDescription>
            You are tracking {watchlist.watchlistStocks.length} stock(s).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {watchlist.watchlistStocks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No stocks added yet. Visit a stock page to add it to your watchlist!
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-4 text-left font-medium">Ticker</th>
                    <th className="p-4 text-left font-medium">Company</th>
                    <th className="p-4 text-left font-medium">Price</th>
                    <th className="p-4 text-left font-medium">Margin of Safety</th>
                    <th className="p-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {watchlist.watchlistStocks.map((ws) => (
                    <tr key={ws.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="p-4 font-bold">
                        <Link href={`/stocks/${ws.stock.ticker}`} className="hover:underline">
                          {ws.stock.ticker}
                        </Link>
                      </td>
                      <td className="p-4">{ws.stock.companyName}</td>
                      <td className="p-4">${ws.stock.currentPrice?.toFixed(2) || "N/A"}</td>
                      <td className="p-4">
                        <span className={`font-medium ${
                          ws.stock.marginOfSafety && ws.stock.marginOfSafety > 20 ? "text-emerald-500" :
                          ws.stock.marginOfSafety && ws.stock.marginOfSafety > 0 ? "text-yellow-500" :
                          "text-red-500"
                        }`}>
                          {ws.stock.marginOfSafety ? ws.stock.marginOfSafety.toFixed(2) + "%" : "N/A"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <RemoveStockButton watchlistId={watchlist.id} stockId={ws.stock.id} ticker={ws.stock.ticker} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
