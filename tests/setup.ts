/* The element helpers Obsidian adds to HTMLElement are installed by importing the
   stub. A module that only imports a type from `obsidian` still calls them, so
   they have to exist before any test runs rather than on first import. */
import './stubs/obsidian';

/* What the browser has and jsdom does not.

   The starfield draws to a canvas and measures panes with getBoundingClientRect;
   jsdom has neither a raster nor a layout. The context here records what it was
   asked to draw so a test can assert the decision, never the pixels. */

export interface DrawnImage {
  x: number;
  y: number;
  width: number;
  height: number;
  alpha: number;
}

export interface RecordingContext extends CanvasRenderingContext2D {
  readonly drawn: DrawnImage[];
  readonly clears: number;
}

function context(canvas: HTMLCanvasElement): RecordingContext {
  const drawn: DrawnImage[] = [];
  const fake = {
    canvas,
    drawn,
    clears: 0,
    globalAlpha: 1,
    fillStyle: '' as string | CanvasGradient,
    clearRect(): void {
      fake.clears++;
    },
    setTransform(): void {},
    scale(): void {},
    beginPath(): void {},
    arc(): void {},
    fill(): void {},
    fillRect(): void {},
    createRadialGradient: () => ({ addColorStop(): void {} }),
    drawImage(_image: unknown, x: number, y: number, width: number, height: number): void {
      drawn.push({ x, y, width, height, alpha: fake.globalAlpha });
    },
  };
  return fake as unknown as RecordingContext;
}

const contexts = new WeakMap<HTMLCanvasElement, RecordingContext>();

/** The recording context a canvas was given, for asserting what was drawn. */
export function drawnOn(canvas: HTMLCanvasElement): RecordingContext | undefined {
  return contexts.get(canvas);
}

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value(this: HTMLCanvasElement) {
    const existing = contexts.get(this);
    if (existing !== undefined) return existing;
    const made = context(this);
    contexts.set(this, made);
    return made;
  },
});

/* No user media preferences exist in jsdom. `matches` is false unless a test
   says otherwise, which is the sky in motion. */
export let reducedMotion = false;

export function setReducedMotion(on: boolean): void {
  reducedMotion = on;
}

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: (media: string) => ({
    media,
    get matches() {
      return media.includes('prefers-reduced-motion') ? reducedMotion : false;
    },
    onchange: null,
    addEventListener(): void {},
    removeEventListener(): void {},
    addListener(): void {},
    removeListener(): void {},
    dispatchEvent: () => false,
  }),
});

/* jsdom lays nothing out, so every rectangle is zero and no pane would ever be
   large enough to draw in. A test states the size it is testing. */
const rects = new WeakMap<Element, DOMRect>();

export function setRect(element: Element, width: number, height: number): void {
  rects.set(element, {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  });
}

Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
  configurable: true,
  value(this: Element) {
    return (
      rects.get(this) ?? {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        toJSON: () => ({}),
      }
    );
  },
});

/** jsdom's window has no size of its own. */
export function setWindowWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
}

/** Neither does it report a device pixel ratio. */
export function setPixelRatio(ratio: number): void {
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: ratio });
}
