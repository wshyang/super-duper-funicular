/**
 * Minimal CanvasRenderingContext2D stand-in for jsdom. It validates colours the
 * way browsers do: assigning an unparsable fillStyle/strokeStyle is ignored, and
 * addColorStop throws a SyntaxError. That is exactly the failure mode that
 * black-screened the app when a gradient stop became `#NaNa2NaN`.
 */

const CSS_COLOR =
  /^(#[0-9a-f]{3}|#[0-9a-f]{6}|#[0-9a-f]{8}|rgba?\([\d.,\s%]+\)|transparent|white|black|red)$/i;

class FakeGradient {
  readonly stops: { offset: number; color: string }[] = [];

  addColorStop(offset: number, color: string): void {
    if (!Number.isFinite(offset) || offset < 0 || offset > 1) {
      throw new Error(`IndexSizeError: offset ${String(offset)} is out of range`);
    }
    if (!isValidCssColor(color)) {
      throw new SyntaxError(`addColorStop: '${color}' is not a valid colour`);
    }
    this.stops.push({ offset, color });
  }
}

export const isValidCssColor = (value: unknown): boolean =>
  value instanceof FakeGradient || (typeof value === 'string' && CSS_COLOR.test(value.trim()));

export interface CanvasAudit {
  operations: number;
  gradients: number;
}

const createContext = (audit: CanvasAudit): CanvasRenderingContext2D => {
  let fillStyle: unknown = '#000';
  let strokeStyle: unknown = '#000';
  const context = {
    canvas: null as unknown as HTMLCanvasElement,
    globalAlpha: 1,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    get fillStyle() {
      return fillStyle;
    },
    set fillStyle(value: unknown) {
      if (!isValidCssColor(value)) {
        throw new SyntaxError(`fillStyle: '${String(value)}' is not a valid colour`);
      }
      fillStyle = value;
    },
    get strokeStyle() {
      return strokeStyle;
    },
    set strokeStyle(value: unknown) {
      if (!isValidCssColor(value)) {
        throw new SyntaxError(`strokeStyle: '${String(value)}' is not a valid colour`);
      }
      strokeStyle = value;
    },
    save: () => undefined,
    restore: () => undefined,
    setTransform: () => undefined,
    translate: () => undefined,
    clearRect: () => undefined,
    fillRect: () => undefined,
    beginPath: () => undefined,
    closePath: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    arc: () => undefined,
    fill: () => {
      audit.operations += 1;
    },
    stroke: () => {
      audit.operations += 1;
    },
    setLineDash: () => undefined,
    createLinearGradient: () => {
      audit.gradients += 1;
      return new FakeGradient() as unknown as CanvasGradient;
    },
    createRadialGradient: () => {
      audit.gradients += 1;
      return new FakeGradient() as unknown as CanvasGradient;
    },
  };
  return context as unknown as CanvasRenderingContext2D;
};

export const installCanvasMock = (): CanvasAudit => {
  const audit: CanvasAudit = { operations: 0, gradients: 0 };
  window.HTMLCanvasElement.prototype.getContext = function getContext(this: HTMLCanvasElement) {
    const context = createContext(audit);
    (context as unknown as { canvas: HTMLCanvasElement }).canvas = this;
    return context;
  } as unknown as typeof window.HTMLCanvasElement.prototype.getContext;
  return audit;
};
