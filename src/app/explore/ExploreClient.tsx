"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getExploreStocksAction, ExploreFilters } from "@/server/stock.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, AlertTriangle, Filter } from "lucide-react";
import Link from "next/link";

export function ExploreClient() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filters State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
  const [page, setPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch initial data or when filters change
  const fetchStocks = useCallback(async (isLoadMore = false) => {
    if (!isLoadMore) {
      setLoading(true);
      setPage(1);
    } else {
      setLoadingMore(true);
    }

    try {
      const filters: ExploreFilters = {
        search: debouncedSearch || undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        sortBy,
        page: isLoadMore ? page + 1 : 1,
        limit: 24,
      };

      const res = await getExploreStocksAction(filters);
      if (res.success && res.data) {
        // @ts-ignore
        const newStocks = res.data.stocks || [];
        // @ts-ignore
        const totalPages = res.data.totalPages || 1;

        if (isLoadMore) {
          setStocks((prev) => [...prev, ...newStocks]);
          setPage((prev) => prev + 1);
        } else {
          setStocks(newStocks);
        }

        const currentPage = isLoadMore ? page + 1 : 1;
        setHasMore(currentPage < totalPages);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch, minPrice, maxPrice, sortBy, page]);

  useEffect(() => {
    fetchStocks(false);
  }, [debouncedSearch, minPrice, maxPrice, sortBy]);

  // Real-time polling for visible stocks
  const stocksRef = useRef(stocks);
  useEffect(() => {
    stocksRef.current = stocks;
  }, [stocks]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const currentStocks = stocksRef.current;
      if (currentStocks.length === 0) return;
      
      const tickers = currentStocks.map(s => s.ticker).join(",");
      try {
        const res = await fetch(`/api/stocks/realtime?tickers=${tickers}`);
        const json = await res.json();
        
        if (json.success && json.data) {
          setStocks(prev => prev.map(stock => {
            const updatedStock = json.data.find((d: any) => d.ticker === stock.ticker);
            // We can even add animation classes if price changed
            if (updatedStock && updatedStock.currentPrice !== stock.currentPrice) {
              return { ...stock, currentPrice: updatedStock.currentPrice };
            }
            return stock;
          }));
        }
      } catch (err) {
        console.error("Failed to fetch real-time updates", err);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <Card className="p-4 bg-muted/20">
        <div className="flex flex-col gap-4 md:grid md:grid-cols-4 lg:grid-cols-5">
          <div className="flex gap-2 md:col-span-2 lg:col-span-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ticker or company..."
                className="pl-9 bg-background w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="md:hidden shrink-0"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          
          <div className={`${showFilters ? "flex flex-col" : "hidden"} gap-4 md:contents`}>
            <div className="grid grid-cols-2 gap-4 md:contents">
              <div>
                <Input
                  type="number"
                  placeholder="Min Price (₹)"
                  className="bg-background w-full"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Max Price (₹)"
                  className="bg-background w-full"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="w-full">
              <Select value={sortBy} onValueChange={(val) => setSortBy(val || "name_asc")}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">A-Z</SelectItem>
                  <SelectItem value="name_desc">Z-A</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="rsi_asc">RSI: Oversold (Low)</SelectItem>
                  <SelectItem value="rsi_desc">RSI: Overbought (High)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : stocks.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground border rounded-lg bg-muted/10">
          <AlertTriangle className="h-10 w-10 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">No stocks found</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {stocks.map((stock) => (
            <Link key={stock.id} href={`/stocks/${stock.ticker}`}>
              <Card className="hover:border-primary/50 transition-colors h-full flex flex-col cursor-pointer group shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {stock.ticker}
                    </CardTitle>
                    {stock.rsi && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        stock.rsi < 30 ? 'bg-emerald-500/10 text-emerald-500' :
                        stock.rsi > 70 ? 'bg-red-500/10 text-red-500' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        RSI: {stock.rsi.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1" title={stock.companyName}>
                    {stock.companyName}
                  </p>
                </CardHeader>
                <CardContent className="mt-auto">
                  <div className="text-2xl font-bold mb-3">
                    ₹{stock.currentPrice?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || "N/A"}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 rounded p-2">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">52W High</span>
                      <span className="font-medium">₹{stock.fiftyTwoWeekHigh?.toFixed(2) || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">52W Low</span>
                      <span className="font-medium">₹{stock.fiftyTwoWeekLow?.toFixed(2) || "-"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Loading More Indicator / Sentinel */}
      {hasMore && !loading && stocks.length > 0 && (
        <div className="py-8 flex justify-center">
          <Button variant="outline" onClick={() => fetchStocks(true)} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loadingMore ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
