import { ISeriesPrimitive, IPrimitivePaneView, IPrimitivePaneRenderer, Time, IChartApiBase, ISeriesApi } from 'lightweight-charts';

class LineRenderer implements IPrimitivePaneRenderer {
  _p1: { x: number; y: number } | null = null;
  _p2: { x: number; y: number } | null = null;
  _color: string;
  _text: string;

  constructor(color: string, text: string) {
    this._color = color;
    this._text = text;
  }

  draw(target: any) {
    if (!this._p1 || !this._p2) return;
    
    target.useMediaCoordinateSpace((scope: any) => {
      const ctx = scope.context as CanvasRenderingContext2D;
      
      ctx.save();
      ctx.strokeStyle = this._color;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(this._p1!.x, this._p1!.y);
      ctx.lineTo(this._p2!.x, this._p2!.y);
      ctx.stroke();

      if (this._text) {
        ctx.fillStyle = this._color;
        ctx.font = '11px sans-serif';
        ctx.textBaseline = 'bottom';
        // Draw text slightly above the middle of the line
        const midX = this._p1!.x + (this._p2!.x - this._p1!.x) / 2;
        const textWidth = ctx.measureText(this._text).width;
        ctx.fillText(this._text, midX - textWidth / 2, this._p1!.y - 4);
      }
      
      ctx.restore();
    });
  }
}

class LinePaneView implements IPrimitivePaneView {
  _source: LinePrimitive;
  _renderer: LineRenderer;

  constructor(source: LinePrimitive, color: string, text: string) {
    this._source = source;
    this._renderer = new LineRenderer(color, text);
  }

  zOrder() {
    return 'normal' as any;
  }

  renderer() {
    return this._renderer;
  }

  update() {
    if (!this._source.series || !this._source.chart) return;
    
    const timeScale = this._source.chart.timeScale();
    const x1 = timeScale.timeToCoordinate(this._source.time1) as number | null;
    let x2 = timeScale.timeToCoordinate(this._source.time2) as number | null;
    const y = this._source.series.priceToCoordinate(this._source.price) as number | null;

    // If x2 is null because it's in the future (off chart bounds), we can extrapolate it or just let the chart clip it.
    // However, if the candle exists on the chart, it shouldn't be null.
    // If it's the last candle, we want it to extend all the way.
    
    if (x1 !== null && y !== null) {
      if (x2 === null) {
          x2 = timeScale.width(); // draw to end of screen if end time is out of bounds
      }
      this._renderer._p1 = { x: x1, y };
      this._renderer._p2 = { x: x2, y };
    } else {
      this._renderer._p1 = null;
      this._renderer._p2 = null;
    }
  }
}

export class LinePrimitive implements ISeriesPrimitive<Time> {
  time1: Time;
  time2: Time;
  price: number;
  
  chart?: IChartApiBase<Time>;
  series?: ISeriesApi<"Candlestick", Time>;
  
  private _paneViews: LinePaneView[];

  constructor(time1: Time, time2: Time, price: number, color: string, text: string = '') {
    this.time1 = time1;
    this.time2 = time2;
    this.price = price;
    this._paneViews = [new LinePaneView(this, color, text)];
  }

  attached(param: { chart: IChartApiBase<Time>; series: any; requestUpdate: () => void }) {
    this.chart = param.chart;
    this.series = param.series;
    this._paneViews[0].update();
    param.requestUpdate();
  }

  detached() {
    this.chart = undefined;
    this.series = undefined;
  }

  updateAllViews() {
    this._paneViews[0].update();
  }

  paneViews() {
    return this._paneViews;
  }
}
