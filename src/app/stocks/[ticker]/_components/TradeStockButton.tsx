"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OrderModal } from "@/components/portfolio/OrderModal";
import { ArrowRightLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface TradeStockButtonProps {
  stockId: string;
  ticker: string;
  currentPrice: number;
  isLoggedIn?: boolean;
}

export function TradeStockButton({ stockId, ticker, currentPrice, isLoggedIn }: TradeStockButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleTradeClick = () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setIsOpen(true);
  };

  return (
    <>
      <Button variant="default" onClick={handleTradeClick} className="bg-blue-600 hover:bg-blue-700 text-white">
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
