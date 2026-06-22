"use client";

import { useState } from "react";
import { screenStocksAction, syncNifty100Action } from "@/server/screener.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, Database } from "lucide-react";
import Link from "next/link";

export default function ScreenerPage() {
  const [minPe, setMinPe] = useState("");
  const [maxPe, setMaxPe] = useState("");
  const [minRoe, setMinRoe] = useState("");
  const [minMos, setMinMos] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSyncNifty100 = async () => {
    if (confirm("This will fetch ~100 stocks sequentially from Yahoo Finance and take 30-60 seconds. Continue?")) {
      setIsSyncing(true);
      const res = await syncNifty100Action();
      setIsSyncing(false);
      if (res.success) {
        alert("Successfully synced Nifty 100 stocks!");
        // Refresh the screener with empty filters to show the newly imported stocks
        setHasSearched(false);
        const e = { preventDefault: () => {} } as React.FormEvent;
        handleSearch(e);
      } else {
        alert(res.error || "Failed to sync");
      }
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const filters: any = {};
    if (minPe) filters.minPe = parseFloat(minPe);
    if (maxPe) filters.maxPe = parseFloat(maxPe);
    if (minRoe) filters.minRoe = parseFloat(minRoe) / 100; // convert % to decimal
    if (minMos) filters.minMarginOfSafety = parseFloat(minMos);

    const res = await screenStocksAction(filters);
    setLoading(false);
    setHasSearched(true);

    if (res.success) {
      setResults(res.stocks || []);
    } else {
      alert(res.error);
    }
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Advanced Screener</h1>
          <p className="text-muted-foreground">
            Filter the market based on strict fundamental criteria to find undervalued gems.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleSyncNifty100} 
          disabled={isSyncing}
          className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20"
        >
          {isSyncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing ~100 Stocks...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Sync Nifty 100
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="grid gap-6 md:grid-cols-4 lg:grid-cols-5 items-end">
            <div className="space-y-2">
              <Label htmlFor="minPe">Min P/E</Label>
              <Input id="minPe" type="number" placeholder="0" value={minPe} onChange={(e) => setMinPe(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPe">Max P/E</Label>
              <Input id="maxPe" type="number" placeholder="25" value={maxPe} onChange={(e) => setMaxPe(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minRoe">Min ROE (%)</Label>
              <Input id="minRoe" type="number" placeholder="15" value={minRoe} onChange={(e) => setMinRoe(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minMos">Min Margin of Safety (%)</Label>
              <Input id="minMos" type="number" placeholder="20" value={minMos} onChange={(e) => setMinMos(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Screen
            </Button>
          </form>
        </CardContent>
      </Card>

      {hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle>Results ({results.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No stocks match your criteria.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-4 text-left font-medium">Ticker</th>
                      <th className="p-4 text-left font-medium">Company</th>
                      <th className="p-4 text-right font-medium">Price</th>
                      <th className="p-4 text-right font-medium">P/E</th>
                      <th className="p-4 text-right font-medium">ROE</th>
                      <th className="p-4 text-right font-medium">Margin of Safety</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((stock) => (
                      <tr key={stock.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="p-4 font-bold">
                          <Link href={`/stocks/${stock.ticker}`} className="text-blue-500 hover:underline">
                            {stock.ticker}
                          </Link>
                        </td>
                        <td className="p-4">{stock.companyName}</td>
                        <td className="p-4 text-right">₹{stock.currentPrice?.toFixed(2) || "N/A"}</td>
                        <td className="p-4 text-right">{stock.pe?.toFixed(2) || "N/A"}</td>
                        <td className="p-4 text-right">
                          {stock.roe ? (stock.roe * 100).toFixed(2) + "%" : "N/A"}
                        </td>
                        <td className="p-4 text-right font-medium">
                          <span className={`${
                            stock.marginOfSafety && stock.marginOfSafety > 20 ? "text-emerald-500" :
                            stock.marginOfSafety && stock.marginOfSafety > 0 ? "text-yellow-500" :
                            "text-red-500"
                          }`}>
                            {stock.marginOfSafety ? stock.marginOfSafety.toFixed(2) + "%" : "N/A"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
