"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockId: string;
  ticker: string;
  currentPrice: number;
  defaultType?: "BUY" | "SELL";
  defaultStrategy?: string;
}

export function OrderModal({
  isOpen,
  onClose,
  stockId,
  ticker,
  currentPrice,
  defaultType = "BUY",
  defaultStrategy = "Manual",
}: OrderModalProps) {
  const [type, setType] = useState<"BUY" | "SELL">(defaultType);
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState(currentPrice.toString());
  const [strategy, setStrategy] = useState(defaultStrategy);
  const [loading, setLoading] = useState(false);

  // Keep price updated if currentPrice prop changes (e.g., live ticks)
  useEffect(() => {
    if (isOpen) {
      setPrice(currentPrice.toString());
      setType(defaultType);
    }
  }, [isOpen, currentPrice, defaultType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/portfolio/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockId,
          type,
          quantity: Number(quantity),
          price: Number(price),
          strategy,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Successfully ${type === "BUY" ? "bought" : "sold"} ${quantity} shares of ${ticker}!`);
        onClose();
      } else {
        alert(data.error || "Trade failed");
      }
    } catch (err) {
      console.error(err);
      alert("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paper Trade: {ticker}</DialogTitle>
          <DialogDescription>
            Execute a dummy {type.toLowerCase()} order. The executed price defaults to the current market price but can be modified.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <div className="flex rounded-md shadow-sm">
                <Button
                  type="button"
                  variant={type === "BUY" ? "default" : "outline"}
                  className={`w-full rounded-r-none ${type === "BUY" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                  onClick={() => setType("BUY")}
                >
                  Buy
                </Button>
                <Button
                  type="button"
                  variant={type === "SELL" ? "default" : "outline"}
                  className={`w-full rounded-l-none border-l-0 ${type === "SELL" ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
                  onClick={() => setType("SELL")}
                >
                  Sell
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="strategy">Strategy Tag</Label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger id="strategy">
                  <SelectValue placeholder="Select Strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manual">Manual / Discretionary</SelectItem>
                  <SelectItem value="44SMA">44 SMA Pullback</SelectItem>
                  <SelectItem value="Fundamental">Fundamental Value</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Execution Price (₹)</Label>
              <Input
                id="price"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 border-t flex justify-between items-center">
            <div className="text-sm">
              <span className="text-muted-foreground">Estimated Total: </span>
              <span className="font-bold">₹{(Number(quantity) * Number(price)).toLocaleString()}</span>
            </div>
            <Button type="submit" disabled={loading} className={type === "BUY" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {type === "BUY" ? "Execute Buy" : "Execute Sell"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
