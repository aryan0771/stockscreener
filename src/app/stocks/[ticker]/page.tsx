import { StockSyncService } from "@/services/stockSyncService";
import { DecisionScoreEngine } from "@/services/decisionScoreEngine";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { WatchlistService } from "@/services/watchlistService";
import { JournalService } from "@/services/journalService";
import { AddStockToWatchlistMenu } from "./_components/AddStockToWatchlistMenu";
import { JournalEditor } from "./_components/JournalEditor";
import { AiSummary } from "./_components/AiSummary";

export default async function StockDetailPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  
  if (!ticker) {
    notFound();
  }

  const upperTicker = ticker.toUpperCase();

  // Sync / Get stock
  let stock;
  try {
    stock = await StockSyncService.syncStock(upperTicker);
  } catch (error) {
    console.error("Error syncing stock", error);
    notFound();
  }

  // Get historical data for the last 2 years to calculate 200-day MA properly
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const chartData = await StockSyncService.getHistoricalData(upperTicker, twoYearsAgo.toISOString().split('T')[0]);

  // Score
  const scoreResult = DecisionScoreEngine.calculateScore(stock);

  // Watchlists & Journal
  const session = await getServerSession(authOptions);
  let userWatchlists: any[] = [];
  let journal = null;
  if (session?.user?.id) {
    userWatchlists = await WatchlistService.getUserWatchlists(session.user.id);
    journal = await JournalService.getJournal(upperTicker, session.user.id);
  }

  const getPeScore = (pe?: number | null) => {
    if (pe === undefined || pe === null) return null;
    if (pe < 0) return { score: 1, color: 'text-red-500' };
    if (pe < 10) return { score: 5, color: 'text-emerald-500' };
    if (pe < 20) return { score: 4, color: 'text-yellow-500' };
    if (pe < 30) return { score: 3, color: 'text-yellow-500' };
    if (pe < 50) return { score: 2, color: 'text-yellow-500' };
    return { score: 1, color: 'text-red-500' };
  };

  const getPbScore = (pb?: number | null) => {
    if (pb === undefined || pb === null) return null;
    if (pb < 0) return { score: 1, color: 'text-red-500' };
    if (pb < 1) return { score: 5, color: 'text-emerald-500' };
    if (pb < 2) return { score: 4, color: 'text-emerald-500' };
    if (pb < 3) return { score: 3, color: 'text-yellow-500' };
    if (pb < 5) return { score: 2, color: 'text-red-500' };
    return { score: 1, color: 'text-red-500' };
  };

  const getHighScore = (currentPrice?: number | null, highPrice?: number | null) => {
    if (!currentPrice || !highPrice || highPrice <= 0) return null;
    const distancePercent = ((highPrice - currentPrice) / highPrice) * 100;
    
    if (distancePercent <= 10) return { score: 5, color: 'text-emerald-500' };
    if (distancePercent <= 20) return { score: 4, color: 'text-yellow-500' };
    if (distancePercent <= 35) return { score: 3, color: 'text-yellow-500' };
    if (distancePercent <= 50) return { score: 2, color: 'text-yellow-500' };
    return { score: 1, color: 'text-red-500' };
  };

  const peScoreObj = getPeScore(stock.pe);
  const pbScoreObj = getPbScore(stock.pb);
  const highScoreObj = getHighScore(stock.currentPrice, stock.fiftyTwoWeekHigh);

  return (
    <div className="container py-8 space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{stock.companyName}</h1>
          <p className="text-muted-foreground text-lg">{stock.exchange}: {stock.ticker} &bull; {stock.sector} &bull; {stock.industry}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-4xl font-bold">₹{stock.currentPrice?.toFixed(2) || 'N/A'}</div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-base ${scoreResult.color}`}>
              {scoreResult.label} (Score: {scoreResult.score})
            </Badge>
            <AddStockToWatchlistMenu ticker={upperTicker} watchlists={userWatchlists} />
          </div>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Main Chart Column */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Price Chart (1Y)</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            {chartData && chartData.length > 0 ? (
              <TradingViewChart data={chartData} />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No chart data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Valuation & Metrics Column */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Valuation Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">P/E Ratio</span>
                <span className={`font-medium ${peScoreObj?.color || ''}`}>
                  {stock.pe?.toFixed(2) || 'N/A'} {peScoreObj && <span className="text-xs ml-1">({peScoreObj.score}/5)</span>}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">P/B Ratio</span>
                <span className={`font-medium ${pbScoreObj?.color || ''}`}>
                  {stock.pb?.toFixed(2) || 'N/A'} {pbScoreObj && <span className="text-xs ml-1">({pbScoreObj.score}/5)</span>}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">EPS (TTM)</span>
                <span className={`font-medium ${
                  stock.eps !== undefined && stock.eps !== null
                    ? stock.eps < 0
                      ? 'text-red-500'
                      : stock.currentPrice && stock.eps > stock.currentPrice * 0.1
                        ? 'text-emerald-500'
                        : 'text-yellow-500'
                    : ''
                }`}>
                  ₹{stock.eps?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">ROE</span>
                <span className={`font-medium ${
                  stock.roe !== undefined && stock.roe !== null
                    ? stock.roe > 0.15
                      ? 'text-emerald-500'
                      : stock.roe >= 0.10
                        ? 'text-yellow-500'
                        : 'text-red-500'
                    : ''
                }`}>
                  {stock.roe ? (stock.roe * 100).toFixed(2) + '%' : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Div Yield</span>
                <span className="font-medium">{stock.dividendYield ? (stock.dividendYield * 100).toFixed(2) + '%' : 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">52W High</span>
                <span className={`font-medium ${highScoreObj?.color || ''}`}>
                  {stock.fiftyTwoWeekHigh ? `₹${stock.fiftyTwoWeekHigh.toFixed(2)}` : 'N/A'}
                  {highScoreObj && <span className="text-xs ml-1">({highScoreObj.score}/5)</span>}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">52W Low</span>
                <span className="font-medium">{stock.fiftyTwoWeekLow ? `₹${stock.fiftyTwoWeekLow.toFixed(2)}` : 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">RSI (14)</span>
                <span className={`font-medium ${
                  stock.rsi !== undefined && stock.rsi !== null
                    ? stock.rsi >= 45 && stock.rsi <= 65 
                      ? 'text-emerald-500' 
                      : 'text-red-500'
                    : ''
                }`}>
                  {stock.rsi ? stock.rsi.toFixed(2) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Industry P/E <span className="text-[10px] italic">(guess)</span></span>
                <span className="font-medium">{stock.industryPe ? stock.industryPe.toFixed(2) : 'N/A'}</span>
              </div>
              
              <div className="pt-4 border-t border-dashed">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg">Intrinsic Value</span>
                  <span className="font-bold text-xl">₹{stock.intrinsicValue?.toFixed(2) || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-semibold text-lg">Margin of Safety</span>
                  <span className={`font-bold text-xl ${
                    stock.marginOfSafety && stock.marginOfSafety > 20 
                      ? 'text-emerald-500' 
                      : stock.marginOfSafety && stock.marginOfSafety > 0 
                        ? 'text-yellow-500' 
                        : 'text-red-500'
                  }`}>
                    {stock.marginOfSafety ? stock.marginOfSafety.toFixed(2) + '%' : 'N/A'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <AiSummary ticker={upperTicker} />
        </div>
      </div>

      {/* Tabs for Journal / Notes / Technicals */}
      <Card>
        <Tabs defaultValue="thesis" className="w-full">
          <CardHeader className="border-b">
            <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
              <TabsTrigger value="thesis">Thesis</TabsTrigger>
              <TabsTrigger value="risks">Risks</TabsTrigger>
              <TabsTrigger value="technicals">Technicals</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="p-6">
            <TabsContent value="thesis" className="mt-0">
              <h3 className="text-lg font-semibold mb-2">Investment Thesis</h3>
              <JournalEditor ticker={upperTicker} field="buyThesis" initialValue={journal?.buyThesis || ""} />
            </TabsContent>
            <TabsContent value="risks" className="mt-0">
              <h3 className="text-lg font-semibold mb-2">Risk Factors</h3>
              <JournalEditor ticker={upperTicker} field="riskFactors" initialValue={journal?.riskFactors || ""} />
            </TabsContent>
            <TabsContent value="technicals" className="mt-0">
              <h3 className="text-lg font-semibold mb-2">Exit Criteria / Technicals</h3>
              <JournalEditor ticker={upperTicker} field="exitCriteria" initialValue={journal?.exitCriteria || ""} />
            </TabsContent>
            <TabsContent value="notes" className="mt-0">
              <h3 className="text-lg font-semibold mb-2">Daily Notes</h3>
              <p className="text-muted-foreground mb-4">Store ongoing chronological notes and convictions here.</p>
              <JournalEditor ticker={upperTicker} field="dailyNotes" initialValue="" />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
