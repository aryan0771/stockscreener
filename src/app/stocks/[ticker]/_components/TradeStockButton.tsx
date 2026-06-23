"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OrderModal } from "@/components/portfolio/OrderModal";
import { ArrowRightLeft } from "lucide-react";

interface TradeStockButtonProps {
  stockId: string;
  ticker: string;
  currentPrice: number;
}

export function TradeStockButton({ stockId, ticker, currentPrice }: TradeStockButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button variant="default" onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
        <ArrowRightLeft className="w-4 h-4 mr-2" />
        Paper Trade
      </Button>

      <OrderModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        stockId={stockId}
        ticker={ticker}
        currentPrice={currentPrice || 0}
      />
    </>
  );
}
