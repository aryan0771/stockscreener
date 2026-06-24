"use client";

import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';

export interface ChartData {
  time: string | number; // 'YYYY-MM-DD'
  open: number;
  high: number;
  low: number;
  close: number;
  value?: number; // for volume
  color?: string; // for volume
}

interface TradingViewChartProps {
  data: ChartData[];
  volumeData?: ChartData[];
  interval?: string; // e.g. '1m', '1d'
  colors?: {
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
    areaTopColor?: string;
    areaBottomColor?: string;
  };
}

function calculateSMA(data: ChartData[], period: number) {
  const smaData = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    smaData.push({ time: data[i].time, value: sum / period });
  }
  return smaData;
}

export function TradingViewChart(props: TradingViewChartProps) {
  const {
    data,
    volumeData,
    interval = '1d',
    colors: {
      backgroundColor = 'transparent',
      lineColor = '#2962FF',
      textColor = 'rgba(255, 255, 255, 0.9)',
      areaTopColor = '#2962FF',
      areaBottomColor = 'rgba(41, 98, 255, 0.28)',
    } = {},
  } = props;

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const ma44SeriesRef = useRef<any>(null);
  const ma200SeriesRef = useRef<any>(null);

  // 1. Initialize Chart Only Once
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
      },
      grid: {
        vertLines: { color: 'rgba(197, 203, 206, 0.03)' },
        horzLines: { color: 'rgba(197, 203, 206, 0.03)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 10,
      },
    });
    
    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });
    candlestickSeriesRef.current = candlestickSeries;

    const isDailyOrAbove = ['1d', '1w', '1mo'].includes(interval);
    
    if (isDailyOrAbove) {
      ma44SeriesRef.current = chart.addSeries(LineSeries, { 
        color: '#22c55e', 
        lineWidth: 2, 
        lastValueVisible: false,
        priceLineVisible: false,
      });

      ma200SeriesRef.current = chart.addSeries(LineSeries, { 
        color: '#a855f7', 
        lineWidth: 2, 
        lastValueVisible: false,
        priceLineVisible: false,
      });
    }

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [backgroundColor, textColor, interval]); // Recreate if core layout or interval changes

  // 2. Update Data seamlessly
  useEffect(() => {
    if (!candlestickSeriesRef.current || !data || data.length === 0) return;

    candlestickSeriesRef.current.setData(data as any);

    const isDailyOrAbove = ['1d', '1w', '1mo'].includes(interval);
    if (isDailyOrAbove) {
      const ma44Data = calculateSMA(data, 44);
      const ma200Data = calculateSMA(data, 200);

      if (ma44SeriesRef.current && ma44Data.length > 0) {
        ma44SeriesRef.current.setData(ma44Data as any);
      }
      if (ma200SeriesRef.current && ma200Data.length > 0) {
        ma200SeriesRef.current.setData(ma200Data as any);
      }
    }

    const vData = volumeData && volumeData.length > 0 ? volumeData : data.map(d => ({
      time: d.time,
      value: d.value,
      color: d.color || (d.close >= d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)')
    })).filter(d => d.value !== undefined);

    if (volumeSeriesRef.current && vData.length > 0) {
      volumeSeriesRef.current.setData(vData as any);
    }

    // Adjust visible range on initial load if we have a lot of data
    // We can use a ref to only do this once to avoid resetting user's zoom on every tick
    const chart = chartRef.current;
    if (chart && !chartRef.current.hasSetInitialRange) {
      const candlesToShow = isDailyOrAbove ? 84 : 100;
      if (data.length > candlesToShow) {
        setTimeout(() => {
          chart.timeScale().setVisibleLogicalRange({
            from: data.length - candlesToShow,
            to: data.length + 10,
          });
          chartRef.current.hasSetInitialRange = true;
        }, 50);
      }
    }
  }, [data, volumeData, interval]);

  return <div ref={chartContainerRef} className="w-full h-full min-h-[400px]" />;
}
