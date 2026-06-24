import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, LineChart, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center px-4 mt-6 mb-6">
      <div className="max-w-3xl space-y-8">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
          Invest With Complete Conviction
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          InvestIQ is your personal production-ready stock analysis platform. Track fundamentals, build conviction journals, and screen the market like an institution.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/register">
            <Button size="lg" className="w-full sm:w-auto text-lg px-8">
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/stocks/AAPL">
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8">
              View Demo Stock
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-8 mt-24 max-w-5xl">
        <div className="flex flex-col items-center space-y-4 p-6 bg-card rounded-xl border border-border/50 shadow-sm">
          <div className="p-3 bg-blue-500/10 rounded-full">
            <BarChart3 className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-xl font-bold">Deep Fundamentals</h3>
          <p className="text-muted-foreground text-sm">
            Automatically track PE, PB, EPS, ROE, ROCE, Debt to Equity, and calculate intrinsic value and margin of safety.
          </p>
        </div>
        <div className="flex flex-col items-center space-y-4 p-6 bg-card rounded-xl border border-border/50 shadow-sm">
          <div className="p-3 bg-emerald-500/10 rounded-full">
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold">Investment Journal</h3>
          <p className="text-muted-foreground text-sm">
            Maintain deep conviction journals. Log your buy thesis, risk factors, and exit criteria securely.
          </p>
        </div>
        <div className="flex flex-col items-center space-y-4 p-6 bg-card rounded-xl border border-border/50 shadow-sm">
          <div className="p-3 bg-purple-500/10 rounded-full">
            <LineChart className="w-8 h-8 text-purple-500" />
          </div>
          <h3 className="text-xl font-bold">Advanced Screener</h3>
          <p className="text-muted-foreground text-sm">
            Filter the market based on strict technical and fundamental criteria. Save and reuse your best screens.
          </p>
        </div>
      </div>
    </div>
  );
}
