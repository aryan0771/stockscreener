import { ISeriesPrimitive, IPrimitivePaneView, IPrimitivePaneRenderer, Time, IChartApiBase, ISeriesApi } from 'lightweight-charts';

class RectangleRenderer implements IPrimitivePaneRenderer {
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
      
      const width = this._p2!.x - this._p1!.x;
      const height = this._p2!.y - this._p1!.y;
      
      ctx.fillStyle = this._color;
      ctx.fillRect(this._p1!.x, this._p1!.y, width, height);

      if (this._text) {
        // Create a solid version of the color for the text if it has opacity
        const solidColor = this._color.replace(/, [\d\.]+\)$/, ', 1)');
        ctx.fillStyle = solidColor.startsWith('rgba') ? solidColor : this._color;
        ctx.font = '11px sans-serif';
        ctx.textBaseline = 'bottom';
        // Draw text in the bottom left corner of the rectangle
        const textY = Math.max(this._p1!.y, this._p2!.y);
        ctx.fillText(this._text, this._p1!.x + 4, textY - 4);
      }
      
      ctx.restore();
    });
  }
}

class RectanglePaneView implements IPrimitivePaneView {
  _source: RectanglePrimitive;
  _renderer: RectangleRenderer;

  constructor(source: RectanglePrimitive, color: string, text: string) {
    this._source = source;
    this._renderer = new RectangleRenderer(color, text);
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
    const y1 = this._source.series.priceToCoordinate(this._source.topPrice) as number | null;
    const y2 = this._source.series.priceToCoordinate(this._source.bottomPrice) as number | null;

    if (x1 !== null && y1 !== null && y2 !== null) {
      if (x2 === null) {
          x2 = timeScale.width(); // Extrapolate to end of screen if it hasn't ended yet
      }
      this._renderer._p1 = { x: Math.min(x1, x2), y: Math.min(y1, y2) };
      this._renderer._p2 = { x: Math.max(x1, x2), y: Math.max(y1, y2) };
    } else {
      this._renderer._p1 = null;
      this._renderer._p2 = null;
    }
  }
}

export class RectanglePrimitive implements ISeriesPrimitive<Time> {
  time1: Time;
  time2: Time;
  topPrice: number;
  bottomPrice: number;
  
  chart?: IChartApiBase<Time>;
  series?: ISeriesApi<"Candlestick", Time>;
  
  private _paneViews: RectanglePaneView[];

  constructor(time1: Time, time2: Time, topPrice: number, bottomPrice: number, color: string, text: string = '') {
    this.time1 = time1;
    this.time2 = time2;
    this.topPrice = topPrice;
    this.bottomPrice = bottomPrice;
    this._paneViews = [new RectanglePaneView(this, color, text)];
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
