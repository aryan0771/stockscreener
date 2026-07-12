"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, SeriesMarker, Time, CandlestickSeries, createSeriesMarkers } from 'lightweight-charts';
import { Candle, SMCResult, SMCColors, defaultColors } from '@/types/smc';

interface SMCChartProps {
  candles: Candle[];
  smcResult: SMCResult | null;
  colors?: SMCColors;
  visibleToggles: {
    bos: boolean;
    choch: boolean;
    idm: boolean;
    fvg: boolean;
    ob: boolean;
  };
}

export default function SMCChart({
  candles,
  smcResult,
  colors = defaultColors,
  visibleToggles
}: SMCChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markersRef = useRef<any>(null);

  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      crosshair: {
        mode: 1, // Normal mode
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
        timeVisible: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: 600,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    const markersPlugin = createSeriesMarkers(series);

    chartRef.current = chart;
    seriesRef.current = series;
    markersRef.current = markersPlugin;
    setChartReady(true);

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Update data and markers
  useEffect(() => {
    if (!seriesRef.current || !candles.length) return;

    // Set candle data
    // Lightweight charts needs strictly unique and sorted times
    const uniqueCandles = candles.filter((c, i, a) => i === 0 || c.time > a[i - 1].time);
    
    // cast time to Time to satisfy lightweight-charts type
    seriesRef.current.setData(uniqueCandles.map(c => ({ ...c, time: c.time as Time })));

    if (!smcResult) {
      if (markersRef.current) markersRef.current.setMarkers([]);
      return;
    }

    const markers: SeriesMarker<Time>[] = [];

    // Add Swings
    smcResult.swingHighs.forEach(sh => {
      markers.push({
        time: sh.time as Time,
        position: 'aboveBar',
        color: colors.swingHigh,
        shape: 'arrowDown',
        text: sh.label || 'HH',
      });
    });

    smcResult.swingLows.forEach(sl => {
      markers.push({
        time: sl.time as Time,
        position: 'belowBar',
        color: colors.swingLow,
        shape: 'arrowUp',
        text: sl.label || 'LL',
      });
    });

    // Add BOS
    if (visibleToggles.bos) {
      smcResult.bos.forEach(b => {
        markers.push({
          time: b.endTime as Time,
          position: b.type === 'Bullish' ? 'belowBar' : 'aboveBar',
          color: b.type === 'Bullish' ? colors.bullishBos : colors.bearishBos,
          shape: 'text',
          text: `BOS`,
        });
      });
    }

    // Add CHoCH
    if (visibleToggles.choch) {
      smcResult.choch.forEach(c => {
        markers.push({
          time: c.endTime as Time,
          position: c.type === 'Bullish' ? 'belowBar' : 'aboveBar',
          color: c.type === 'Bullish' ? colors.bullishChoch : colors.bearishChoch,
          shape: 'text',
          text: `CHoCH`,
        });
      });
    }

    // Add FVG
    if (visibleToggles.fvg) {
      smcResult.fvgs.forEach(f => {
        markers.push({
          time: f.startTime as Time,
          position: f.type === 'Bullish' ? 'belowBar' : 'aboveBar',
          color: f.type === 'Bullish' ? colors.bullishFvg : colors.bearishFvg,
          shape: 'text',
          text: `FVG`,
        });
      });
    }

    // Add Order Blocks
    if (visibleToggles.ob) {
      smcResult.orderBlocks.forEach(ob => {
        markers.push({
          time: ob.startTime as Time,
          position: ob.type === 'Bullish' ? 'belowBar' : 'aboveBar',
          color: ob.type === 'Bullish' ? colors.bullishOb : colors.bearishOb,
          shape: 'text',
          text: `OB`,
        });
      });
    }

    // Sort markers by time (required by lightweight-charts)
    markers.sort((a, b) => (a.time as number) - (b.time as number));

    if (markersRef.current) {
      markersRef.current.setMarkers(markers);
    }

  }, [candles, smcResult, colors, visibleToggles, chartReady]);

  return (
    <div className="relative w-full h-[600px] border border-gray-800 rounded-lg overflow-hidden bg-[#131722]">
      <div ref={chartContainerRef} className="absolute inset-0" />
    </div>
  );
}
