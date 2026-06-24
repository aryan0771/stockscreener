import { NextResponse } from 'next/server';
import { StockSyncService } from '@/services/stockSyncService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tickersParam = searchParams.get('tickers');

    if (!tickersParam) {
      return NextResponse.json({ success: false, error: 'Tickers parameter is required' }, { status: 400 });
    }

    const tickers = tickersParam.split(',').map(t => t.trim()).filter(Boolean);
    
    if (tickers.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid tickers provided' }, { status: 400 });
    }

    // Optionally restrict the number of tickers to prevent abuse
    if (tickers.length > 50) {
       return NextResponse.json({ success: false, error: 'Too many tickers requested' }, { status: 400 });
    }

    const realtimeData = await StockSyncService.syncRealtimeQuotes(tickers);

    return NextResponse.json({ success: true, data: realtimeData });
  } catch (error: any) {
    console.error('Error fetching realtime stock data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
