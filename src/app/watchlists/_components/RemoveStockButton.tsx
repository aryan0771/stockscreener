"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { removeStockFromWatchlistAction } from "@/server/watchlist.actions";
import { toast } from "sonner";

export function RemoveStockButton({ watchlistId, stockId, ticker }: { watchlistId: string; stockId: string; ticker: string }) {
  const [loading, setLoading] = useState(false);

  const performRemove = async () => {
    setLoading(true);
    await removeStockFromWatchlistAction(watchlistId, stockId);
    setLoading(false);
    toast.success(`${ticker} removed from watchlist`);
  };

  const handleRemove = () => {
    toast(`Remove ${ticker} from this watchlist?`, {
      action: {
        label: "Remove",
        onClick: performRemove,
      },
    });
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleRemove} disabled={loading} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
      <Trash className="h-4 w-4" />
    </Button>
  );
}
