"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Database, Loader2 } from "lucide-react";
import { syncNifty100Action, syncNifty500Action, syncPennyStocksAction } from "@/server/screener.actions";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SyncDashboardButton() {
  const { data: session } = useSession();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncTarget, setSyncTarget] = useState("100");
  const router = useRouter();

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "aryan@yopmail.com";
  const isAdmin = session?.user?.email === adminEmail;

  if (!isAdmin) return null;

  const handleSync = async () => {
    let action;
    let label;
    let confirmMsg;

    if (syncTarget === "100") {
      action = syncNifty100Action;
      label = "Nifty 100";
      confirmMsg = "This will fetch ~100 stocks sequentially from Yahoo Finance and take 30-60 seconds. Continue?";
    } else if (syncTarget === "500") {
      action = syncNifty500Action;
      label = "Nifty 500";
      confirmMsg = "This will fetch ~500 stocks sequentially and may take 2-5 minutes. Continue?";
    } else {
      action = syncPennyStocksAction;
      label = "Penny Stocks";
      confirmMsg = "This will fetch ~250 Microcap/Penny stocks sequentially. Continue?";
    }

    if (confirm(confirmMsg)) {
      setIsSyncing(true);
      const res = await action();
      setIsSyncing(false);
      if (res.success) {
        alert(`Successfully synced ${label} stocks!`);
        router.refresh();
      } else {
        alert(res.error || "Failed to sync");
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={syncTarget} onValueChange={(val) => setSyncTarget(val || "100")}>
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="Select target" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="100">Nifty 100</SelectItem>
          <SelectItem value="500">Nifty 500</SelectItem>
          <SelectItem value="penny">Penny Stocks</SelectItem>
        </SelectContent>
      </Select>
      <Button 
        variant="outline" 
        onClick={handleSync} 
        disabled={isSyncing}
        className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20 h-9"
      >
        {isSyncing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            <Database className="mr-2 h-4 w-4" />
            Sync Data
          </>
        )}
      </Button>
    </div>
  );
}
