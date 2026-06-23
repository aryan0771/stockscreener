"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, TrendingUp, ChevronLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import StockDetailModal from "../_components/StockDetailModal";
import { OrderModal } from "@/components/portfolio/OrderModal";

export default function Sma44ScreenerPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Form State
  const [distancePercent, setDistancePercent] = useState("3");
  const [touchLookback, setTouchLookback] = useState("5");
  const [confirmation, setConfirmation] = useState("break-high");
  const [minVolume, setMinVolume] = useState("100000");

  // Modal State
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedOrderStock, setSelectedOrderStock] = useState<any>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/screener/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trendSMA: 200,
          pullbackSMA: 44,
          distancePercent: parseFloat(distancePercent),
          touchLookback: parseInt(touchLookback),
          confirmation,
          minVolume: parseInt(minVolume),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResults(data.stocks || []);
      } else {
        alert(data.error || "Failed to run screener");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  };

  const handleAddToWatchlist = async (stockId: string) => {
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockId }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Successfully added to SMA44 Opportunities Watchlist!");
      } else {
        alert(data.error || "Failed to add to watchlist");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    }
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/screener" className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">44 SMA Pullback</h1>
          </div>
          <p className="text-muted-foreground">
            Find strong stocks in a long-term uptrend pulling back perfectly to their 44-day moving average.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Strategy Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="grid gap-6 md:grid-cols-4 lg:grid-cols-5 items-end">
            <div className="space-y-2">
              <Label htmlFor="distancePercent">Max Distance % from 44SMA</Label>
              <Input id="distancePercent" type="number" step="0.1" value={distancePercent} onChange={(e) => setDistancePercent(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="touchLookback">Touch Lookback (Candles)</Label>
              <Input id="touchLookback" type="number" value={touchLookback} onChange={(e) => setTouchLookback(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmation">Bullish Confirmation</Label>
              <Select value={confirmation} onValueChange={(val) => setConfirmation(val || "none")}>
                <SelectTrigger id="confirmation">
                  <SelectValue placeholder="Select Confirmation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Confirmation</SelectItem>
                  <SelectItem value="bullish-candle">Green Candle</SelectItem>
                  <SelectItem value="break-high">Break Previous High</SelectItem>
                  <SelectItem value="engulfing">Bullish Engulfing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minVolume">Minimum Volume</Label>
              <Input id="minVolume" type="number" value={minVolume} onChange={(e) => setMinVolume(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Scan Market
            </Button>
          </form>
        </CardContent>
      </Card>

      {hasSearched && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Matches ({results.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                <TrendingUp className="w-12 h-12 mb-4 opacity-20" />
                <p>No stocks currently match the 44SMA pullback criteria.</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-4 text-left font-medium">Symbol</th>
                      <th className="p-4 text-right font-medium">Score</th>
                      <th className="p-4 text-right font-medium">Price</th>
                      <th className="p-4 text-right font-medium">44 SMA</th>
                      <th className="p-4 text-right font-medium">Distance</th>
                      <th className="p-4 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.stockId} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="p-4 font-bold">
                          <Link href={`/stocks/${r.symbol}`} className="text-blue-500 hover:underline">
                            {r.symbol}
                          </Link>
                          <div className="text-xs text-muted-foreground font-normal">{r.companyName}</div>
                        </td>
                        <td className="p-4 text-right font-bold text-emerald-500">{r.score.toFixed(1)}</td>
                        <td className="p-4 text-right">₹{r.currentPrice.toFixed(2)}</td>
                        <td className="p-4 text-right text-muted-foreground">₹{r.sma44.toFixed(2)}</td>
                        <td className="p-4 text-right font-medium">
                          {r.distancePercent.toFixed(2)}%
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm" onClick={() => { setSelectedOrderStock(r); setOrderModalOpen(true); }}>
                              Trade
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setSelectedTicker(r.symbol)}>
                              Chart
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => handleAddToWatchlist(r.stockId)}>
                              + Watchlist
                            </Button>
                          </div>
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

      {/* Stock Detail Modal */}
      {selectedTicker && (
        <StockDetailModal 
          ticker={selectedTicker} 
          onClose={() => setSelectedTicker(null)} 
        />
      )}

      {/* Order Modal */}
      {selectedOrderStock && (
        <OrderModal
          isOpen={orderModalOpen}
          onClose={() => { setOrderModalOpen(false); setSelectedOrderStock(null); }}
          stockId={selectedOrderStock.stockId}
          ticker={selectedOrderStock.symbol}
          currentPrice={selectedOrderStock.currentPrice}
          defaultType="BUY"
          defaultStrategy="44SMA"
        />
      )}
    </div>
  );
}
