import { SkywalkerSettings } from '../settings';

/**
 * A starfield drawn on canvas.
 *
 * It began as one element per star, which was measurably wrong: 2143 stars ran
 * at 30fps against 60 with the fields hidden. The elements themselves were free
 * — the same 2143 with their animations switched off also ran at 60. What cost
 * the frames was 754 independent CSS animations, each promoting its element to
 * its own compositor layer. Seven hundred layers is not something to tune; it is
 * something to stop doing.
 *
 * One canvas per region is one layer per region, and the stars become numbers in
 * an array. Thousands cost nothing, a resize is a change of canvas dimensions,
 * and there is no DOM to reconcile.
 *
 * The look follows jo_Geek's Night Sky pen (MIT): sizes in discrete tiers rather
 * than a continuous spread, a glow on the largest only, small stars blinking
 * quickly and large ones slowly, and most of the sky holding still while the few
 * that do blink go fully out rather than merely dimming.
 */

const CANVAS_CLASS = 'loop-starfield';
const BAND_CLASS = 'loop-starfield-band';
const ACTIVE_CLASS = 'loop-starfield-active';

/** Size in px, glow radius multiplier, and the period band it blinks in. */
const TIERS = [
  { size: 0.5, glow: 0, period: [1.2, 2.4], weight: 34 },
  { size: 1.0, glow: 0, period: [1.6, 3.0], weight: 30 },
  { size: 1.5, glow: 0, period: [2.0, 3.6], weight: 18 },
  { size: 2.0, glow: 2.5, period: [2.6, 4.5], weight: 10 },
  { size: 2.5, glow: 3.5, period: [3.0, 5.5], weight: 6 },
  { size: 3.5, glow: 5.0, period: [3.5, 6.5], weight: 2 },
];

interface Region {
  selector: string;
  enabled: (s: SkywalkerSettings) => boolean;
  /** The top strip is a band across the window rather than a pane. */
  fixedBand?: boolean;
  /** Dimmed against the top bar, so the edges stay in the background. */
  edge?: boolean;
}

const REGIONS: Region[] = [
  { selector: 'body', enabled: (s) => s.starRegionTop, fixedBand: true },
  { selector: '.workspace-split.mod-left-split', enabled: (s) => s.starRegionLeft, edge: true },
  { selector: '.workspace-split.mod-right-split', enabled: (s) => s.starRegionRight, edge: true },
  {
    selector: '.workspace-leaf-content[data-type="empty"] .view-content',
    enabled: (s) => s.starRegionEmptyTab,
    edge: true,
  },
];

/** Panes are far larger than the top strip, so they take a fraction of its
 *  density; without this a pane would carry twenty times its stars. */
const EDGE_DENSITY = 0.22;

interface Star {
  /** Fractions of the canvas, so a resize moves nothing. */
  x: number;
  y: number;
  size: number;
  glow: number;
  colour: string;
  rest: number;
  /** Zero when this star does not blink, which most do not. */
  period: number;
  phase: number;
  drift: number;
  driftPeriod: number;
  driftPhase: number;
}

interface Field {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  stars: Star[];
  brightness: number;
  host: HTMLElement;
  band: boolean;
  bandHeight: number;
  width: number;
  height: number;
}

const fields: Field[] = [];
let frame: number | null = null;

/** Pre-rendered dot per size, glow and colour. Drawing a cached bitmap beats an
 *  arc and a gradient for every star on every frame. */
const sprites = new Map<string, HTMLCanvasElement>();

/** Hex to `r, g, b`, so stops can carry their own alpha. */
function channels(hex: string): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full.slice(0, 6), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function sprite(size: number, glow: number, colour: string, dpr: number): HTMLCanvasElement {
  const key = `${size}|${glow}|${colour}|${dpr}`;
  const cached = sprites.get(key);
  if (cached) return cached;

  const radius = size / 2;
  const reach = Math.max(radius + glow, radius * 1.2);
  const side = Math.max(Math.ceil(reach * 2), 2);
  const c = document.createElement('canvas');
  c.width = Math.ceil(side * dpr);
  c.height = Math.ceil(side * dpr);

  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
    const mid = side / 2;
    if (glow > 0) {
      // A straight ramp from solid to transparent spreads the light evenly over
      // the whole radius and the star comes out a soft ball. box-shadow falls
      // off like a Gaussian instead, with almost all of it gathered near the
      // core, so these stops approximate that curve: mostly gone by a third of
      // the way out, a faint halo the rest of the way.
      const rgb = channels(colour);
      const core = Math.min(radius / reach, 0.9);
      const g = ctx.createRadialGradient(mid, mid, 0, mid, mid, reach);
      g.addColorStop(0, `rgba(${rgb}, 1)`);
      g.addColorStop(core, `rgba(${rgb}, 1)`);
      g.addColorStop(core + (1 - core) * 0.18, `rgba(${rgb}, 0.34)`);
      g.addColorStop(core + (1 - core) * 0.42, `rgba(${rgb}, 0.09)`);
      g.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, side, side);
    } else {
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.arc(mid, mid, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  sprites.set(key, c);
  return c;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickTier() {
  const total = TIERS.reduce((n, t) => n + t.weight, 0);
  let roll = Math.random() * total;
  for (const tier of TIERS) {
    roll -= tier.weight;
    if (roll <= 0) return tier;
  }
  return TIERS[0];
}

function makeStar(settings: SkywalkerSettings): Star {
  const tier = pickTier();
  const scale = settings.starScale / 100;
  const speed = Math.max(settings.starSpeed, 1) / 100;
  const size = tier.size * scale;
  const blinks = Math.random() * 100 < settings.starBlinkShare;
  const warm = Math.random() * 100 < settings.starWarmShare;
  const period = blinks ? rand(tier.period[0], tier.period[1]) / speed : 0;
  const depth = size / (TIERS[TIERS.length - 1].size * scale);

  return {
    x: Math.random(),
    y: Math.random(),
    size,
    glow: tier.glow ? size * tier.glow : 0,
    colour: warm ? settings.starWarmColor : settings.starColor,
    rest: rand(0.35, 1),
    period,
    phase: Math.random() * (period || 1),
    drift: settings.starDrift * depth,
    driftPeriod: rand(70, 140),
    driftPhase: Math.random() * 140,
  };
}

function draw(now: number): void {
  const seconds = now / 1000;
  const dpr = window.devicePixelRatio || 1;

  for (const field of fields) {
    const { ctx } = field;
    ctx.clearRect(0, 0, field.width, field.height);

    for (const star of stars(field)) {
      // A blinking star goes fully out and back; the rest hold at their own
      // brightness, which is what keeps the sky from reading as a chase.
      let alpha = field.brightness * star.rest;
      if (star.period > 0) {
        const t = (seconds + star.phase) / star.period;
        alpha *= Math.abs(Math.cos(Math.PI * t));
      }
      if (alpha < 0.012) continue;

      let x = star.x * field.width;
      if (star.drift > 0) {
        const t = (seconds + star.driftPhase) / star.driftPeriod;
        x += Math.sin(t * Math.PI * 2) * star.drift;
      }

      const img = sprite(star.size, star.glow, star.colour, dpr);
      const side = img.width / dpr;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, x - side / 2, star.y * field.height - side / 2, side, side);
    }

    ctx.globalAlpha = 1;
  }

  frame = fields.length ? window.requestAnimationFrame(draw) : null;
}

function stars(field: Field): Star[] {
  return field.stars;
}

function measure(field: Field): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = field.host.getBoundingClientRect();

  field.width = field.band ? window.innerWidth : rect.width;
  field.height = field.band ? field.bandHeight : rect.height;
  field.canvas.width = Math.round(field.width * dpr);
  field.canvas.height = Math.round(field.height * dpr);
  field.canvas.style.height = `${field.height}px`;
  field.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function wanted(field: Field, settings: SkywalkerSettings): number {
  const density = settings.starCount / (window.innerWidth * settings.starHeight);
  const spread = field.band ? 1 : EDGE_DENSITY;
  return Math.min(
    Math.round(density * field.width * field.height * spread),
    settings.starMax
  );
}

export function renderStarfield(settings: SkywalkerSettings): void {
  removeStarfield();
  if (!settings.starfieldEnabled || settings.starCount < 1) return;
  if (settings.starHeight <= 0 || window.innerWidth <= 0) return;

  for (const region of REGIONS) {
    if (!region.enabled(settings)) continue;

    const hosts =
      region.selector === 'body'
        ? [document.body]
        : Array.from(document.querySelectorAll<HTMLElement>(region.selector));

    for (const host of hosts) {
      const canvas = host.createEl('canvas', {
        cls: region.fixedBand ? `${CANVAS_CLASS} ${BAND_CLASS}` : CANVAS_CLASS,
      });
      canvas.setAttribute('aria-hidden', 'true');

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        canvas.detach();
        continue;
      }

      const field: Field = {
        canvas,
        ctx,
        stars: [],
        brightness: region.edge
          ? (settings.starBrightness / 100) * (settings.starEdgeBrightness / 100)
          : settings.starBrightness / 100,
        host,
        band: !!region.fixedBand,
        bandHeight: settings.starHeight,
        width: 0,
        height: 0,
      };
      measure(field);

      if (field.width < 1 || field.height < 1) {
        canvas.detach();
        continue;
      }

      const count = wanted(field, settings);
      if (count < 1) {
        canvas.detach();
        continue;
      }

      field.stars = Array.from({ length: count }, () => makeStar(settings));
      fields.push(field);
    }
  }

  if (!fields.length) return;
  document.body.addClass(ACTIVE_CLASS);
  if (frame === null) frame = window.requestAnimationFrame(draw);
}

/**
 * A pane changed size. Stars are fractions of the canvas, so they keep their
 * arrangement and only the count moves — a wider pane shows more sky rather than
 * a different one.
 */
export function resizeStarfield(settings: SkywalkerSettings): boolean {
  if (!fields.length) return false;
  if (fields.some((f) => !f.host.isConnected)) return false;

  for (const field of fields) {
    measure(field);
    const count = wanted(field, settings);
    if (count > field.stars.length) {
      while (field.stars.length < count) field.stars.push(makeStar(settings));
    } else if (count < field.stars.length) {
      field.stars.length = Math.max(count, 0);
    }
  }
  return true;
}

export function removeStarfield(): void {
  for (const field of fields) field.canvas.detach();
  fields.length = 0;
  if (frame !== null) {
    window.cancelAnimationFrame(frame);
    frame = null;
  }
  document.body.removeClass(ACTIVE_CLASS);
}
