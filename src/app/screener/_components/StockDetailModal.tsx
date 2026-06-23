"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InteractiveChart } from "@/app/stocks/[ticker]/_components/InteractiveChart";

interface StockDetailModalProps {
  ticker: string;
  onClose: () => void;
}

export default function StockDetailModal({ ticker, onClose }: StockDetailModalProps) {
  // We can render the InteractiveChart component directly inside the modal
  // By default it handles data fetching for the given ticker.
  // The InteractiveChart uses TradingViewChart which already plots 44 SMA and 200 SMA on the '1d' interval!

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{ticker} Chart</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden relative w-full h-full">
          <InteractiveChart ticker={ticker} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
