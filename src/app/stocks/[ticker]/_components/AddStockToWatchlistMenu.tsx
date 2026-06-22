"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookmarkPlus, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { addStockToWatchlistAction } from "@/server/watchlist.actions";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function AddStockToWatchlistMenu({ ticker, watchlists }: { ticker: string; watchlists: any[] }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  if (!session) {
    return (
      <Button variant="outline" onClick={() => router.push("/login")}>
        <BookmarkPlus className="mr-2 h-4 w-4" /> Add to Watchlist
      </Button>
    );
  }

  const handleAdd = async (watchlistId: string) => {
    setLoading(watchlistId);
    const res = await addStockToWatchlistAction(watchlistId, ticker);
    setLoading(null);
    if (!res.success) {
      alert(res.error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <BookmarkPlus className="mr-2 h-4 w-4" /> Add to Watchlist
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Your Watchlists</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {watchlists.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground text-center">
              No watchlists found.
            </div>
          ) : (
            watchlists.map((w) => (
              <DropdownMenuItem key={w.id} onClick={() => handleAdd(w.id)} disabled={loading === w.id}>
                {loading === w.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {w.name}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
