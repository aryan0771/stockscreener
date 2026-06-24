import { NextRequest, NextResponse } from "next/server";
import { ScannerService } from "@/services/screener/scanner.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Parse config
    const trendSMA = parseInt(body.trendSMA) || 200;
    const pullbackSMA = parseInt(body.pullbackSMA) || 44;
    const distancePercent = parseFloat(body.distancePercent) || 3;
    const touchLookback = parseInt(body.touchLookback) || 5;
    const confirmation = body.confirmation || "none";
    const minVolume = parseInt(body.minVolume) || 100000;
    const maxPrice = body.maxPrice ? parseFloat(body.maxPrice) : undefined;

    const matches = await ScannerService.runSma44Scan({
      trendSMA,
      pullbackSMA,
      distancePercent,
      touchLookback,
      confirmation,
      minVolume,
      maxPrice,
    });

    return NextResponse.json({
      success: true,
      count: matches.length,
      stocks: matches,
    });

  } catch (error: any) {
    console.error("Manual screener run failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
