import { NextRequest, NextResponse } from "next/server";
import { ScannerService } from "@/services/screener/scanner.service";

// Mark this route as dynamic so it is not statically cached
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // In production, we'd verify an Authorization header token
    // to prevent unauthorized triggers. 
    // e.g. if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) ...

    console.log("Starting daily SMA44 screener scan...");

    // Run the scan with default production parameters
    const matches = await ScannerService.runSma44Scan({
      trendSMA: 200,
      pullbackSMA: 44,
      distancePercent: 3,
      touchLookback: 5,
      confirmation: "break-high",
      minVolume: 100000,
    });

    console.log(`Daily scan complete. Found ${matches.length} matches.`);

    return NextResponse.json({
      success: true,
      message: `Scanned and saved ${matches.length} qualifying stocks.`,
    });

  } catch (error: any) {
    console.error("Cron scan failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
