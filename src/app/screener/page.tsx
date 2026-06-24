"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { TrendingUp, BarChart2, Coins } from "lucide-react";
import { useSession } from "next-auth/react";

export default function ScreenerHubPage() {
  const { data: session } = useSession();
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "aryan@yopmail.com";
  const isAdmin = session?.user?.email === adminEmail;

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

  if (isAdmin) {
    strategies.push({
      title: "Penny 44 SMA Pullback",
      description: "Admin Only: Filter strictly for penny/microcap stocks under ₹50 pulling back to their 44 SMA.",
      href: "/screener/penny44",
      icon: <Coins className="w-8 h-8 text-amber-500 mb-4" />,
      color: "border-amber-500/20 hover:border-amber-500/50"
    });
  }

  return (
    <div className="container py-8 space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Strategy Screener Hub</h1>
        <p className="text-muted-foreground">
          Select a screening algorithm below to find high-probability trading and investing setups.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
