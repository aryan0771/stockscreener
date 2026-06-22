"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Database, Loader2 } from "lucide-react";
import { syncNifty100Action } from "@/server/screener.actions";
import { useRouter } from "next/navigation";

export function SyncDashboardButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  const handleSyncNifty100 = async () => {
    if (confirm("This will fetch ~100 stocks sequentially from Yahoo Finance and take 30-60 seconds. Continue?")) {
      setIsSyncing(true);
      const res = await syncNifty100Action();
      setIsSyncing(false);
      if (res.success) {
        alert("Successfully synced Nifty 100 stocks!");
        router.refresh();
      } else {
        alert(res.error || "Failed to sync");
      }
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleSyncNifty100} 
      disabled={isSyncing}
      className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20"
    >
      {isSyncing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Syncing Database...
        </>
      ) : (
        <>
          <Database className="mr-2 h-4 w-4" />
          Sync Nifty 100
        </>
      )}
    </Button>
  );
}
