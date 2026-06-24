"use client";

import { useState } from "react";
import { screenStocksAction, syncNifty100Action, syncNifty500Action, syncPennyStocksAction } from "@/server/screener.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, Database } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, Suspense, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSession } from "next-auth/react";

function ScreenerContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "aryan@yopmail.com";
  const isAdmin = session?.user?.email === adminEmail;

  const [minPe, setMinPe] = useState("");
  const [maxPe, setMaxPe] = useState("");
  const [minRoe, setMinRoe] = useState("");
  const [minMos, setMinMos] = useState("");
  const [signal, setSignal] = useState<string>("");
  const [trend, setTrend] = useState<string>("");
  const [healthyRsi, setHealthyRsi] = useState<boolean>(false);
  
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncTarget, setSyncTarget] = useState("100");
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Initialize from searchParams
  useEffect(() => {
    let shouldSearch = false;
    if (searchParams.get("minMos")) {
      setMinMos(searchParams.get("minMos")!);
      shouldSearch = true;
    }
    if (searchParams.get("signal")) {
      setSignal(searchParams.get("signal")!);
      shouldSearch = true;
    }
    if (searchParams.get("trend")) {
      setTrend(searchParams.get("trend")!);
      shouldSearch = true;
    }
    if (searchParams.get("healthyRsi")) {
      setHealthyRsi(searchParams.get("healthyRsi") === "true");
      shouldSearch = true;
    }

    if (shouldSearch) {
      // Small timeout to ensure state is flushed if needed
    }
  }, [searchParams]);

  const executeSearch = useCallback(async (
    customMinPe: string, customMaxPe: string, customMinRoe: string, customMinMos: string, 
    customSignal: string, customTrend: string, customHealthyRsi: boolean
  ) => {
    setLoading(true);

    const filters: any = {};
    if (customMinPe) filters.minPe = parseFloat(customMinPe);
    if (customMaxPe) filters.maxPe = parseFloat(customMaxPe);
    if (customMinRoe) filters.minRoe = parseFloat(customMinRoe) / 100; // convert % to decimal
    if (customMinMos) filters.minMarginOfSafety = parseFloat(customMinMos);
    if (customSignal && customSignal !== "All") filters.signal = customSignal;
    if (customTrend && customTrend !== "All") filters.trend = customTrend;
    if (customHealthyRsi) filters.healthyRsi = true;

    const res = await screenStocksAction(filters);
    setLoading(false);
    setHasSearched(true);

    if (res.success) {
      setResults(res.stocks || []);
    } else {
      alert(res.error);
    }
  }, []);

  // Trigger search when searchParams load initially
  useEffect(() => {
    if (searchParams.toString()) {
      executeSearch(
        searchParams.get("minPe") || minPe,
        searchParams.get("maxPe") || maxPe,
        searchParams.get("minRoe") || minRoe,
        searchParams.get("minMos") || minMos,
        searchParams.get("signal") || signal,
        searchParams.get("trend") || trend,
        searchParams.get("healthyRsi") === "true" || healthyRsi
      );
    }
  }, [searchParams, executeSearch]); // Only runs on mount when searchParams populate

  const handleSync = async () => {
    let action;
    let label;
    let confirmMsg;

    if (syncTarget === "100") {
      action = syncNifty100Action;
      label = "Nifty 100";
      confirmMsg = "This will fetch ~100 stocks sequentially from Yahoo Finance and take 30-60 seconds. Continue?";
    } else if (syncTarget === "500") {
      action = syncNifty500Action;
      label = "Nifty 500";
      confirmMsg = "This will fetch ~500 stocks sequentially and may take 2-5 minutes. Continue?";
    } else {
      action = syncPennyStocksAction;
      label = "Penny Stocks";
      confirmMsg = "This will fetch ~250 Microcap/Penny stocks sequentially. Continue?";
    }

    if (confirm(confirmMsg)) {
      setIsSyncing(true);
      const res = await action();
      setIsSyncing(false);
      if (res.success) {
        alert(`Successfully synced ${label} stocks!`);
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
    executeSearch(minPe, maxPe, minRoe, minMos, signal, trend, healthyRsi);
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
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Select value={syncTarget} onValueChange={(val) => setSyncTarget(val || "100")}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Select target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">Nifty 100</SelectItem>
                <SelectItem value="500">Nifty 500</SelectItem>
                <SelectItem value="penny">Penny Stocks</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={handleSync} 
              disabled={isSyncing}
              className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20 h-9"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Sync Data
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="grid gap-6 md:grid-cols-4 lg:grid-cols-5 items-end">
            <div className="space-y-2">
              <Label htmlFor="signal">Algorithm Signal</Label>
              <Select value={signal} onValueChange={(val) => setSignal(val || "")}>
                <SelectTrigger id="signal">
                  <SelectValue placeholder="Any Signal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">Any Signal</SelectItem>
                  <SelectItem value="BuyWatch">Strong Buy / Watch Closely</SelectItem>
                  <SelectItem value="Strong Buy">Strong Buy Only</SelectItem>
                  <SelectItem value="Watch Closely">Watch Closely Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trend">Price Trend</Label>
              <Select value={trend} onValueChange={(val) => setTrend(val || "")}>
                <SelectTrigger id="trend">
                  <SelectValue placeholder="Any Trend" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">Any Trend</SelectItem>
                  <SelectItem value="Uptrend">Uptrend (Near 52W High)</SelectItem>
                  <SelectItem value="Downtrend">Downtrend (&gt;30% Drop)</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <div className="space-y-2 flex flex-col justify-end pb-2">
              <div className="flex items-center space-x-2">
                <Switch id="healthyRsi" checked={healthyRsi} onCheckedChange={setHealthyRsi} />
                <Label htmlFor="healthyRsi">Healthy RSI (30-60)</Label>
              </div>
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

export default function ScreenerPage() {
  return (
    <Suspense fallback={<div className="container py-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ScreenerContent />
    </Suspense>
  );
}
