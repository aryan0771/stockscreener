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
    colors: {
      backgroundColor = 'transparent',
      lineColor = '#2962FF',
      textColor = 'rgba(255, 255, 255, 0.9)',
      areaTopColor = '#2962FF',
      areaBottomColor = 'rgba(41, 98, 255, 0.28)',
    } = {},
  } = props;

  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
    };

    const chart: any = createChart(chartContainerRef.current, {
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
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    candlestickSeries.setData(data as any);

    // Calculate and add Moving Averages
    const ma44Data = calculateSMA(data, 44);
    const ma200Data = calculateSMA(data, 200);

    if (ma44Data.length > 0) {
      const ma44Series = chart.addSeries(LineSeries, { 
        color: '#22c55e', 
        lineWidth: 2, 
        lastValueVisible: false,
        priceLineVisible: false,
      });
      ma44Series.setData(ma44Data as any);
    }

    if (ma200Data.length > 0) {
      const ma200Series = chart.addSeries(LineSeries, { 
        color: '#a855f7', 
        lineWidth: 2, 
        lastValueVisible: false,
        priceLineVisible: false,
      });
      ma200Series.setData(ma200Data as any);
    }

    // Always plot volume from data if not explicitly provided
    const vData = volumeData && volumeData.length > 0 ? volumeData : data.map(d => ({
      time: d.time,
      value: d.value,
      color: d.color
    })).filter(d => d.value !== undefined);

    if (vData && vData.length > 0) {
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

      volumeSeries.setData(vData as any);
    }

    // Set visible range to only the last 84 trading days (roughly 4 months)
    // This allows MA200 to be perfectly calculated from the hidden previous data
    if (data.length > 84) {
      setTimeout(() => {
        chart.timeScale().setVisibleLogicalRange({
          from: data.length - 84,
          to: data.length - 1,
        });
      }, 50);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, volumeData, backgroundColor, lineColor, textColor, areaTopColor, areaBottomColor]);

  return <div ref={chartContainerRef} className="w-full h-full min-h-[400px]" />;
}
