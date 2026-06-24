"use client";

import { useState, useEffect } from "react";
import { TradingViewChart } from "@/components/charts/TradingViewChart";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface InteractiveChartProps {
  ticker: string;
}

const intervals = [
  { label: '1m', value: '1m' },
  { label: '3m', value: '3m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1H', value: '1h' },
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
  { label: '1M', value: '1mo' },
];

export function InteractiveChart({ ticker }: InteractiveChartProps) {
  const [interval, setInterval] = useState<string>("1m");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/stocks/${ticker}/chart?interval=${interval}`);
        if (!res.ok) {
          throw new Error("Failed to fetch chart data");
        }
        const json = await res.json();
        if (isMounted) {
          setData(json);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "An error occurred");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [ticker, interval]);

  return (
    <div className="w-full flex flex-col space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {intervals.map((int) => (
          <Button
            key={int.value}
            variant={interval === int.value ? "default" : "outline"}
            size="sm"
            onClick={() => setInterval(int.value)}
            disabled={loading}
          >
            {int.label}
          </Button>
        ))}
      </div>

      <div className="w-full h-[400px] relative border rounded-md bg-card overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        {error && !loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-muted-foreground">
            No chart data available for {interval}
          </div>
        )}

        {data.length > 0 && (
          <TradingViewChart data={data} interval={interval} />
        )}
      </div>
    </div>
  );
}
