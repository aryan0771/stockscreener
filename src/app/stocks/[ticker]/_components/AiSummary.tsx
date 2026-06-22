"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { generateStockSummaryAction } from "@/server/ai.actions";

export function AiSummary({ ticker }: { ticker: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    const res = await generateStockSummaryAction(ticker);
    setLoading(false);

    if (res.success) {
      setSummary(res.summary || "No summary generated.");
    } else {
      setError(res.error || "Failed to generate summary");
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card to-blue-900/10 border-blue-500/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          AI Research Assistant
        </CardTitle>
        {!summary && (
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate Analysis
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-3">Analyzing financial metrics...</span>
          </div>
        )}
        {error && <div className="text-red-500 py-4">{error}</div>}
        {summary && (
          <div className="prose prose-sm dark:prose-invert max-w-none pt-4 whitespace-pre-wrap">
            {summary}
          </div>
        )}
        {!summary && !loading && !error && (
          <p className="text-muted-foreground pt-2">
            Click generate to get an instant institutional-grade summary powered by Google Gemini.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
