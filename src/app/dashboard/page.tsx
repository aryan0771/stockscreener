import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WatchlistService } from "@/services/watchlistService";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DecisionScoreEngine } from "@/services/decisionScoreEngine";
import { SyncDashboardButton } from "./_components/SyncDashboardButton";
import { Activity, TrendingDown, Target, ShieldCheck, ArrowRight, BookOpen, Bookmark, TrendingUp, Briefcase } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch Watchlists
  const watchlists = await WatchlistService.getUserWatchlists(session.user.id);
  const totalStocksTracked = watchlists.reduce((acc, w) => acc + w.watchlistStocks.length, 0);

  // Fetch Recent Journals
  const recentJournals = await prisma.investmentJournal.findMany({
    where: { userId: session.user.id },
    include: { stock: true },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });

  // Calculate Market Metrics
  const allStocks = await prisma.stock.findMany();
  
  let belowIntrinsic = 0;
  let strongBuy = 0;
  let watchClosely = 0;
  let uptrend = 0;
  let downtrend = 0;
  let healthyRsi = 0;

  for (const stock of allStocks) {
    if (stock.marginOfSafety && stock.marginOfSafety > 0) belowIntrinsic++;
    
    const { label } = DecisionScoreEngine.calculateScore(stock);
    if (label === "Strong Buy") strongBuy++;
    if (label === "Watch Closely") watchClosely++;

    if (stock.currentPrice && stock.fiftyTwoWeekHigh) {
      const drop = ((stock.fiftyTwoWeekHigh - stock.currentPrice) / stock.fiftyTwoWeekHigh) * 100;
      if (drop <= 15) uptrend++;
      if (drop > 30) downtrend++;
    }

    if (stock.rsi !== null && stock.rsi !== undefined && stock.rsi >= 30 && stock.rsi <= 60) healthyRsi++;
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back, {session.user.name || "Investor"}</h1>
          <p className="text-muted-foreground">
            Here is an overview of your portfolio tracking and the latest market intelligence.
          </p>
        </div>
        <SyncDashboardButton />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Market Metrics Row 1 */}
        <Card className="bg-gradient-to-br from-card to-emerald-900/10 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Strong Buy / Watch</CardTitle>
            <Target className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Link href="/screener?signal=Strong+Buy" className="hover:underline text-emerald-600 dark:text-emerald-400">{strongBuy}</Link>
              <span className="text-muted-foreground text-sm font-normal mx-1">/</span>
              <Link href="/screener?signal=Watch+Closely" className="hover:underline text-blue-600 dark:text-blue-400">{watchClosely}</Link>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Algorithm buy signals</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-blue-900/10 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Below Intrinsic Value</CardTitle>
            <ShieldCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Link href="/screener?minMos=0.01" className="hover:underline">{belowIntrinsic}</Link>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Margin of safety &gt; 0%</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-orange-900/10 border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Uptrend / Downtrend</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Link href="/screener?trend=Uptrend" className="hover:underline text-emerald-600 dark:text-emerald-400">{uptrend}</Link>
              <span className="text-muted-foreground text-sm font-normal mx-1">/</span>
              <Link href="/screener?trend=Downtrend" className="hover:underline text-red-600 dark:text-red-400">{downtrend}</Link>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Price momentum</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-purple-900/10 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Healthy RSI</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Link href="/screener?healthyRsi=true" className="hover:underline">{healthyRsi}</Link>
            </div>
            <p className="text-xs text-muted-foreground mt-1">RSI between 30 - 60</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-emerald-900/10 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Watchlists</CardTitle>
            <Bookmark className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{watchlists.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active lists</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-blue-900/10 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stocks Tracked</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStocksTracked}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all watchlists</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-purple-900/10 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Investment Journals</CardTitle>
            <BookOpen className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentJournals.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total written thesis</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-amber-900/10 border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Paper Portfolio</CardTitle>
            <Briefcase className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mt-1">
              <Link href="/dashboard/portfolio" className="hover:underline text-amber-600 dark:text-amber-400">View Holdings</Link>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Test your strategies risk-free</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Watchlists Snapshot */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Watchlists</CardTitle>
              <CardDescription>Recently updated tracking lists.</CardDescription>
            </div>
            <Link href="/watchlists">
              <Button variant="ghost" size="sm">View All <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {watchlists.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No watchlists found. <Link href="/watchlists" className="text-blue-500 hover:underline">Create one</Link>.
              </div>
            ) : (
              <div className="space-y-4">
                {watchlists.slice(0, 4).map((w) => (
                  <div key={w.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium">{w.name}</div>
                      <div className="text-sm text-muted-foreground">{w.watchlistStocks.length} stocks</div>
                    </div>
                    <Link href={`/watchlists/${w.id}`}>
                      <Button variant="outline" size="sm">Open</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Journals Snapshot */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Journals</CardTitle>
              <CardDescription>Your latest investment thesis entries.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {recentJournals.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No journals found. Visit a stock page to write one.
              </div>
            ) : (
              <div className="space-y-4">
                {recentJournals.map((j) => (
                  <div key={j.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium">{j.stock.ticker} - {j.stock.companyName}</div>
                      <div className="text-sm text-muted-foreground">
                        Updated {j.updatedAt.toLocaleDateString()}
                      </div>
                    </div>
                    <Link href={`/stocks/${j.stock.ticker}`}>
                      <Button variant="outline" size="sm">Review</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
