"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Briefcase, History, Wallet, TrendingUp, TrendingDown, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { OrderModal } from "@/components/portfolio/OrderModal";

export default function PortfolioPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [tradeBook, setTradeBook] = useState<any[]>([]);

  // Order Modal State for quick exit
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<any>(null);

  // Mobile expansion state
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const toggleRow = (id: string) => {
    setExpandedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const fetchPortfolioData = async () => {
    setLoading(true);
    try {
      const [sumRes, holdRes, ledgRes] = await Promise.all([
        fetch("/api/portfolio/summary"),
        fetch("/api/portfolio/positions"),
        fetch("/api/portfolio/ledger")
      ]);

      const sumData = await sumRes.json();
      const holdData = await holdRes.json();
      const ledgData = await ledgRes.json();

      if (sumData.success) setSummary(sumData.summary);
      if (holdData.success) setHoldings(holdData.holdings);
      if (ledgData.success) {
        setLedger(ledgData.ledger);
        setTradeBook(ledgData.tradeBook);
      }
    } catch (err) {
      console.error("Failed to fetch portfolio data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const handleExitClick = (holding: any) => {
    setSelectedHolding(holding);
    setOrderModalOpen(true);
  };

  if (loading && !summary) {
    return (
      <div className="container py-12 flex justify-center items-center h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Briefcase className="w-8 h-8 text-primary" /> Dummy Portfolio
          </h1>
          <p className="text-muted-foreground">
            Paper trading simulator to test your strategies without real financial risk.
          </p>
        </div>
        <Button variant="outline" onClick={fetchPortfolioData} disabled={loading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {summary && (
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-card to-blue-900/10 border-blue-500/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Available Cash</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summary.balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-card to-purple-900/10 border-purple-500/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Invested Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summary.totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-amber-900/10 border-amber-500/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summary.totalCurrentValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br from-card shadow-sm border-opacity-30 ${
            summary.unrealizedPnl >= 0 ? "to-emerald-900/20 border-emerald-500" : "to-red-900/20 border-red-500"
          }`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unrealized P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold flex items-center gap-2 ${summary.unrealizedPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {summary.unrealizedPnl >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                ₹{Math.abs(summary.unrealizedPnl).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="holdings" className="w-full">
        <TabsList className="flex w-full overflow-x-auto overflow-y-hidden justify-start md:inline-flex md:w-auto md:justify-center bg-card border shadow-sm p-1 rounded-lg h-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <TabsTrigger value="holdings" className="whitespace-nowrap px-6 py-2 min-w-fit">Holdings</TabsTrigger>
          <TabsTrigger value="tradebook" className="whitespace-nowrap px-6 py-2 min-w-fit">Trade Book</TabsTrigger>
          <TabsTrigger value="ledger" className="whitespace-nowrap px-6 py-2 min-w-fit">Cash Ledger</TabsTrigger>
          <TabsTrigger value="strategies" className="whitespace-nowrap px-6 py-2 min-w-fit">Strategies</TabsTrigger>
        </TabsList>

        <TabsContent value="holdings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Open Positions</CardTitle>
              <CardDescription>Your currently held stocks and their live P&L.</CardDescription>
            </CardHeader>
            <CardContent>
              {holdings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No open positions. Go to a stock page or screener to buy!
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block rounded-md border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="p-4 text-left font-medium">Stock</th>
                          <th className="p-4 text-left font-medium">Strategy</th>
                          <th className="p-4 text-right font-medium">Qty</th>
                          <th className="p-4 text-right font-medium">Avg Price</th>
                          <th className="p-4 text-right font-medium">LTP</th>
                          <th className="p-4 text-right font-medium">Invested</th>
                          <th className="p-4 text-right font-medium">Current</th>
                          <th className="p-4 text-right font-medium">P&L</th>
                          <th className="p-4 text-right font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holdings.map((h) => (
                          <tr key={h.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                            <td className="p-4 font-bold">
                              <Link href={`/stocks/${h.stock.ticker}`} className="text-blue-500 hover:underline">
                                {h.stock.ticker}
                              </Link>
                            </td>
                            <td className="p-4">
                              <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs">
                                {h.strategy}
                              </span>
                            </td>
                            <td className="p-4 text-right">{h.quantity}</td>
                            <td className="p-4 text-right">₹{h.averagePrice.toFixed(2)}</td>
                            <td className="p-4 text-right">₹{h.currentPrice.toFixed(2)}</td>
                            <td className="p-4 text-right text-muted-foreground">₹{h.investedValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td className="p-4 text-right text-muted-foreground">₹{h.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td className={`p-4 text-right font-bold ${h.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {h.pnl >= 0 ? '+' : ''}{h.pnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ({h.pnlPercent.toFixed(2)}%)
                            </td>
                            <td className="p-4 text-right">
                              <Button variant="destructive" size="sm" onClick={() => handleExitClick(h)}>Exit</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="block md:hidden space-y-4">
                    {holdings.map((h) => {
                      const isExpanded = expandedRows.includes(h.id);
                      return (
                        <div key={h.id} className="border rounded-md p-4 bg-card shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <Link href={`/stocks/${h.stock.ticker}`} className="text-blue-500 font-bold hover:underline text-base">
                                {h.stock.ticker}
                              </Link>
                              <div className="mt-1">
                                <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md text-xs">
                                  {h.strategy}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium border px-2 py-1 rounded bg-muted/50">Qty: {h.quantity}</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                            <div className="bg-muted/30 p-2 rounded">
                              <div className="text-muted-foreground mb-1">Buy Price</div>
                              <div className="font-medium">₹{h.averagePrice.toFixed(2)}</div>
                            </div>
                            <div className="bg-muted/30 p-2 rounded">
                              <div className="text-muted-foreground mb-1">Current Price</div>
                              <div className="font-medium">₹{h.currentPrice.toFixed(2)}</div>
                            </div>
                            <div className="bg-muted/30 p-2 rounded">
                              <div className="text-muted-foreground mb-1">Invested</div>
                              <div className="font-medium">₹{h.investedValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                            </div>
                            <div className="bg-muted/30 p-2 rounded">
                              <div className="text-muted-foreground mb-1">Current Value</div>
                              <div className="font-medium">₹{h.currentValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t animate-in fade-in zoom-in-95 duration-200">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-sm text-muted-foreground">Unrealized P&L</span>
                                <span className={`text-sm font-bold ${h.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {h.pnl >= 0 ? '+' : ''}{h.pnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ({h.pnlPercent.toFixed(2)}%)
                                </span>
                              </div>
                              <Button variant="destructive" className="w-full" size="sm" onClick={() => handleExitClick(h)}>Exit Position</Button>
                            </div>
                          )}

                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full mt-1 text-xs h-8 text-muted-foreground hover:text-foreground" 
                            onClick={() => toggleRow(h.id)}
                          >
                            {isExpanded ? "Collapse Details" : "View P&L and Actions"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tradebook" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Trade Book</CardTitle>
              <CardDescription>History of all your executed paper trades.</CardDescription>
            </CardHeader>
            <CardContent>
              {tradeBook.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No trades executed yet.</div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="p-4 text-left font-medium">Date</th>
                        <th className="p-4 text-left font-medium">Stock</th>
                        <th className="p-4 text-left font-medium">Type</th>
                        <th className="p-4 text-left font-medium">Strategy</th>
                        <th className="p-4 text-right font-medium">Qty</th>
                        <th className="p-4 text-right font-medium">Price</th>
                        <th className="p-4 text-right font-medium">Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tradeBook.map((t) => (
                        <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="p-4 text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</td>
                          <td className="p-4 font-bold">{t.stock.ticker}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${t.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                              {t.type}
                            </span>
                          </td>
                          <td className="p-4">{t.strategy}</td>
                          <td className="p-4 text-right">{t.quantity}</td>
                          <td className="p-4 text-right">₹{t.price.toFixed(2)}</td>
                          <td className="p-4 text-right font-medium">₹{(t.quantity * t.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cash Ledger</CardTitle>
              <CardDescription>Wallet transactions, deposits, and trade settlements.</CardDescription>
            </CardHeader>
            <CardContent>
              {ledger.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No ledger entries.</div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="p-4 text-left font-medium">Date</th>
                        <th className="p-4 text-left font-medium">Type</th>
                        <th className="p-4 text-left font-medium">Description</th>
                        <th className="p-4 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.map((l) => (
                        <tr key={l.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="p-4 text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</td>
                          <td className="p-4">
                            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
                              {l.type}
                            </span>
                          </td>
                          <td className="p-4">{l.description}</td>
                          <td className={`p-4 text-right font-bold ${l.amount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {l.amount >= 0 ? '+' : ''}₹{Math.abs(l.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Performance</CardTitle>
              <CardDescription>A breakdown of your unrealized P&L grouped by strategy tags.</CardDescription>
            </CardHeader>
            <CardContent>
              {holdings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No active strategies running.</div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="p-4 text-left font-medium">Strategy Tag</th>
                        <th className="p-4 text-right font-medium">Active Positions</th>
                        <th className="p-4 text-right font-medium">Total Invested</th>
                        <th className="p-4 text-right font-medium">Total Value</th>
                        <th className="p-4 text-right font-medium">Unrealized P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(new Set(holdings.map(h => h.strategy))).map((strat) => {
                        const stratHoldings = holdings.filter(h => h.strategy === strat);
                        const posCount = stratHoldings.length;
                        const inv = stratHoldings.reduce((s, h) => s + h.investedValue, 0);
                        const cur = stratHoldings.reduce((s, h) => s + h.currentValue, 0);
                        const pnl = cur - inv;
                        const pnlP = (pnl / inv) * 100;

                        return (
                          <tr key={strat as string} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                            <td className="p-4 font-bold">{strat as string}</td>
                            <td className="p-4 text-right">{posCount}</td>
                            <td className="p-4 text-right">₹{inv.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td className="p-4 text-right">₹{cur.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td className={`p-4 text-right font-bold ${pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {pnl >= 0 ? '+' : ''}₹{Math.abs(pnl).toLocaleString('en-IN', { maximumFractionDigits: 2 })} ({pnlP.toFixed(2)}%)
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Render the generic OrderModal for exits */}
      {selectedHolding && (
        <OrderModal
          isOpen={orderModalOpen}
          onClose={() => {
            setOrderModalOpen(false);
            fetchPortfolioData(); // refresh data after close
          }}
          stockId={selectedHolding.stock.id}
          ticker={selectedHolding.stock.ticker}
          currentPrice={selectedHolding.currentPrice}
          defaultType="SELL"
          defaultStrategy={selectedHolding.strategy}
        />
      )}
    </div>
  );
}
