"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { TrendingUp, BarChart2 } from "lucide-react";

export default function ScreenerHubPage() {
  const strategies = [
    {
      title: "Fundamental Deep Value",
      description: "Screen for undervalued gems using PE, ROE, Margin of Safety, and Algorithm signals.",
      href: "/screener/fundamental",
      icon: <BarChart2 className="w-8 h-8 text-blue-500 mb-4" />,
      color: "border-blue-500/20 hover:border-blue-500/50"
    },
    {
      title: "44 SMA Pullback Strategy",
      description: "Identify stocks in a long-term uptrend pulling back to their 44 Simple Moving Average for a bounce.",
      href: "/screener/sma44",
      icon: <TrendingUp className="w-8 h-8 text-emerald-500 mb-4" />,
      color: "border-emerald-500/20 hover:border-emerald-500/50"
    }
  ];

  return (
    <div className="container py-8 space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Strategy Screener Hub</h1>
        <p className="text-muted-foreground">
          Select a screening algorithm below to find high-probability trading and investing setups.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {strategies.map((strategy) => (
          <Link key={strategy.href} href={strategy.href}>
            <Card className={`h-full transition-all cursor-pointer ${strategy.color}`}>
              <CardHeader>
                {strategy.icon}
                <CardTitle>{strategy.title}</CardTitle>
                <CardDescription className="pt-2">
                  {strategy.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
