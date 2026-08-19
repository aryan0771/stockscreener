"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Target, LineChart, ShieldAlert } from "lucide-react";

export default function PerformancePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/portfolio/performance")
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setData(res.performance);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container py-8 text-center text-muted-foreground">
        Failed to load performance data.
      </div>
    );
  }

  const { overall, strategies } = data;

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Trading Performance</h1>
        <p className="text-muted-foreground">
          Track your demo trading results and strategy analytics over time.
        </p>
      </div>

      {/* Overall Performance */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
            <Target className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{overall.totalInvested.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            {overall.totalPnl >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overall.totalPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {overall.totalPnl >= 0 ? "+" : ""}₹{overall.totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Realized: ₹{overall.totalRealizedPnl.toFixed(2)} | Unrealized: ₹{overall.totalUnrealizedPnl.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Best Strategy</CardTitle>
            <LineChart className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overall.bestStrategy}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Worst Strategy</CardTitle>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overall.worstStrategy}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-8">
        <h2 className="text-2xl font-bold tracking-tight pt-4">Strategy Breakdown</h2>
        
        {strategies.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            No trades executed yet. Run a screener and place some paper trades to see performance.
          </div>
        ) : (
          strategies.map((st: any) => (
            <Card key={st.name} className="overflow-hidden">
              <CardHeader className="bg-muted/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      {st.name} 
                      <Badge variant={st.totalPnl >= 0 ? "default" : "destructive"} className={st.totalPnl >= 0 ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                        {st.totalPnl >= 0 ? "Profitable" : "Loss Making"}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Active for {st.daysActive} days
                    </CardDescription>
                  </div>
                  
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground block text-xs">Est. Annual Return</span>
                      <span className={`font-bold ${st.estimatedAnnualReturn >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {st.estimatedAnnualReturn > 0 ? "+" : ""}{st.estimatedAnnualReturn.toFixed(2)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Est. Monthly Return</span>
                      <span className={`font-bold ${st.estimatedMonthlyReturn >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {st.estimatedMonthlyReturn > 0 ? "+" : ""}{st.estimatedMonthlyReturn.toFixed(2)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Worst Stock</span>
                      <span className="font-bold text-red-500">
                        {st.worstStockSymbol} (₹{st.worstStockPnl.toFixed(2)})
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-y">
                      <tr>
                        <th className="p-4 text-left font-medium">Stock</th>
                        <th className="p-4 text-right font-medium">Status</th>
                        <th className="p-4 text-right font-medium">Score When Bought</th>
                        <th className="p-4 text-right font-medium">Quantity</th>
                        <th className="p-4 text-right font-medium">Invested</th>
                        <th className="p-4 text-right font-medium">Realized P&L</th>
                        <th className="p-4 text-right font-medium">Unrealized P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {st.stocks.map((stock: any, i: number) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-blue-500">{stock.symbol}</div>
                            <div className="text-xs text-muted-foreground">{stock.companyName}</div>
                          </td>
                          <td className="p-4 text-right">
                            <Badge variant="outline" className={stock.status === "Active" ? "border-emerald-500 text-emerald-500" : "border-muted-foreground text-muted-foreground"}>
                              {stock.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-right font-medium">
                            {stock.scoreWhenBought !== null ? stock.scoreWhenBought.toFixed(2) : "-"}
                          </td>
                          <td className="p-4 text-right">{stock.quantity}</td>
                          <td className="p-4 text-right">₹{stock.amountInvested.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td className={`p-4 text-right font-medium ${stock.realizedPnl > 0 ? "text-emerald-500" : stock.realizedPnl < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                            {stock.realizedPnl > 0 ? "+" : ""}₹{stock.realizedPnl.toFixed(2)}
                          </td>
                          <td className={`p-4 text-right font-medium ${stock.unrealizedPnl > 0 ? "text-emerald-500" : stock.unrealizedPnl < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                            {stock.unrealizedPnl > 0 ? "+" : ""}₹{stock.unrealizedPnl.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
