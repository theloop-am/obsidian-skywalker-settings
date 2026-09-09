/*
 * Skywalker Settings - Plugin for Obsidian
 * Copyright (c) 2026 theLOOP
 * SPDX-License-Identifier: MIT
 */

import type { SkywalkerSettings } from './settings';

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
 * Four rules separate a sky from a decoration: sizes in discrete tiers rather
 * than a continuous spread, a glow on the largest only, small stars blinking
 * quickly and large ones slowly, and most of the sky holding still while the few
 * that do blink go fully out rather than merely dimming.
 */

const CANVAS_CLASS = 'loopsk-starfield';
const BAND_CLASS = 'loopsk-starfield-band';

interface Tier {
  /** Core diameter in px, before the size slider scales it. */
  readonly size: number;
  /** Halo reach in px beyond the core; zero for a bare point. */
  readonly glow: number;
  /** The band of blink periods, in seconds. */
  readonly period: readonly [number, number];
  /** Share of stars drawn from this tier, relative to the others. */
  readonly weight: number;
}

/* The halo used to be a multiple of the size, which put a five-times lever on
   the size slider: at 190% the largest star reached 36.6px and came out as a
   smear seventy pixels across. It is an absolute distance now, growing with the
   square root of the scale so it still responds without running away. */
const TIERS: readonly [Tier, ...Tier[]] = [
  { size: 0.5, glow: 0, period: [1.2, 2.4], weight: 34 },
  { size: 1.0, glow: 0, period: [1.6, 3.0], weight: 30 },
  { size: 1.5, glow: 0, period: [2.0, 3.6], weight: 18 },
  { size: 2.0, glow: 1.6, period: [2.6, 4.5], weight: 10 },
  { size: 2.5, glow: 2.6, period: [3.0, 5.5], weight: 6 },
  { size: 3.5, glow: 4.0, period: [3.5, 6.5], weight: 2 },
];

const LARGEST = TIERS.reduce((widest, tier) => (tier.size > widest.size ? tier : widest), TIERS[0]);

const TOTAL_WEIGHT = TIERS.reduce((sum, tier) => sum + tier.weight, 0);

interface Region {
  readonly selector: string;
  readonly enabled: (settings: SkywalkerSettings) => boolean;
  /** The top strip is a band across the window rather than a pane. */
  readonly fixedBand?: boolean;
  /** Dimmed against the top bar, so the edges stay in the background. */
  readonly edge?: boolean;
}

const REGIONS: readonly Region[] = [
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
/** The hosts the last build looked at, including any it declined to draw into. */
let covered: HTMLElement[] = [];
let frame: number | null = null;

/** The elements the settings ask for a sky in, in the order the regions declare. */
function hostsFor(settings: SkywalkerSettings): HTMLElement[] {
  const hosts: HTMLElement[] = [];
  for (const region of REGIONS) {
    if (!region.enabled(settings)) continue;
    if (region.selector === 'body') hosts.push(document.body);
    else hosts.push(...Array.from(document.querySelectorAll<HTMLElement>(region.selector)));
  }
  return hosts;
}

/** Someone who has asked the system for less movement should get a still sky,
 *  not a stopped one: the stars stay, they simply hold their brightness. */
function stillSky(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** A retina canvas costs four times the pixels of a plain one, and a third of
 *  that again above 2. Past that the stars are already smaller than anything
 *  the extra resolution could show. */
const MAX_DPR = 2;

function ratio(): number {
  return Math.min(window.devicePixelRatio || 1, MAX_DPR);
}

/** Pre-rendered dot per size, glow and colour. Drawing a cached bitmap beats an
 *  arc and a gradient for every star on every frame. */
const sprites = new Map<string, HTMLCanvasElement>();

/** Hex to `r, g, b`, so stops can carry their own alpha. */
function channels(hex: string): string {
  const digits = hex.replace('#', '');
  const full =
    digits.length === 3
      ? digits
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : digits;
  const packed = Number.parseInt(full.slice(0, 6), 16);
  return `${(packed >> 16) & 255}, ${(packed >> 8) & 255}, ${packed & 255}`;
}

function sprite(size: number, glow: number, colour: string, dpr: number): HTMLCanvasElement {
  const key = `${size}|${glow}|${colour}|${dpr}`;
  const cached = sprites.get(key);
  if (cached !== undefined) return cached;

  const radius = size / 2;
  const reach = Math.max(radius + glow, radius * 1.2);
  const side = Math.max(Math.ceil(reach * 2), 2);
  const canvas = createEl('canvas');
  canvas.width = Math.ceil(side * dpr);
  canvas.height = Math.ceil(side * dpr);

  const ctx = canvas.getContext('2d');
  if (ctx !== null) {
    ctx.scale(dpr, dpr);
    const mid = side / 2;
    if (glow > 0) {
      /* A straight ramp from solid to transparent spreads the light evenly over
         the whole radius and the star comes out a soft ball. box-shadow falls
         off like a Gaussian instead, with almost all of it gathered near the
         core, so these stops approximate that curve: mostly gone by a third of
         the way out, a faint halo the rest of the way. */
      const rgb = channels(colour);
      const core = Math.min(radius / reach, 0.9);
      const gradient = ctx.createRadialGradient(mid, mid, 0, mid, mid, reach);
      gradient.addColorStop(0, `rgba(${rgb}, 1)`);
      gradient.addColorStop(core, `rgba(${rgb}, 1)`);
      gradient.addColorStop(core + (1 - core) * 0.18, `rgba(${rgb}, 0.34)`);
      gradient.addColorStop(core + (1 - core) * 0.42, `rgba(${rgb}, 0.09)`);
      gradient.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, side, side);
    } else {
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.arc(mid, mid, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  sprites.set(key, canvas);
  return canvas;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickTier(): Tier {
  let roll = Math.random() * TOTAL_WEIGHT;
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
  const depth = size / (LARGEST.size * scale);

  return {
    x: Math.random(),
    y: Math.random(),
    size,
    glow: tier.glow > 0 ? tier.glow * Math.sqrt(scale) : 0,
    colour: warm ? settings.starWarmColor : settings.starColor,
    rest: rand(0.35, 1),
    period,
    phase: Math.random() * (period || 1),
    drift: settings.starDrift * depth,
    driftPeriod: rand(70, 140),
    driftPhase: Math.random() * 140,
  };
}

/** Below this a star is indistinguishable from the background. */
const INVISIBLE = 0.012;

function draw(now: number): void {
  const seconds = stillSky() ? 0 : now / 1000;
  const dpr = ratio();

  for (const field of fields) {
    const { ctx } = field;
    ctx.clearRect(0, 0, field.width, field.height);

    for (const star of field.stars) {
      /* A blinking star goes fully out and back; the rest hold at their own
         brightness, which is what keeps the sky from reading as a chase. */
      let alpha = field.brightness * star.rest;
      if (star.period > 0) {
        alpha *= Math.abs(Math.cos((Math.PI * (seconds + star.phase)) / star.period));
      }
      if (alpha < INVISIBLE) continue;

      let x = star.x * field.width;
      if (star.drift > 0) {
        const turn = (seconds + star.driftPhase) / star.driftPeriod;
        x += Math.sin(turn * Math.PI * 2) * star.drift;
      }

      const image = sprite(star.size, star.glow, star.colour, dpr);
      const side = image.width / dpr;
      ctx.globalAlpha = alpha;
      ctx.drawImage(image, x - side / 2, star.y * field.height - side / 2, side, side);
    }

    ctx.globalAlpha = 1;
  }

  /* A still sky is drawn once. A hidden window is not drawn at all until it
     comes back, so nothing is spent painting what nobody is looking at. */
  frame =
    fields.length > 0 && !stillSky() && !document.hidden
      ? window.requestAnimationFrame(draw)
      : null;
}

/** Picks the loop back up after it stopped for a hidden window. */
export function wakeStarfield(): void {
  if (fields.length > 0 && frame === null && !stillSky() && !document.hidden) {
    frame = window.requestAnimationFrame(draw);
  }
}

function measure(field: Field): void {
  const dpr = ratio();
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
  return Math.min(Math.round(density * field.width * field.height * spread), settings.starMax);
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

    covered.push(...hosts);

    for (const host of hosts) {
      const canvas = host.createEl('canvas', {
        cls: region.fixedBand === true ? `${CANVAS_CLASS} ${BAND_CLASS}` : CANVAS_CLASS,
      });
      canvas.setAttribute('aria-hidden', 'true');

      const ctx = canvas.getContext('2d');
      if (ctx === null) {
        canvas.detach();
        continue;
      }

      const field: Field = {
        canvas,
        ctx,
        stars: [],
        brightness:
          region.edge === true
            ? (settings.starBrightness / 100) * (settings.starEdgeBrightness / 100)
            : settings.starBrightness / 100,
        host,
        band: region.fixedBand === true,
        bandHeight: settings.starHeight,
        width: 0,
        height: 0,
      };
      measure(field);

      const count = field.width < 1 || field.height < 1 ? 0 : wanted(field, settings);
      if (count < 1) {
        canvas.detach();
        continue;
      }

      field.stars = Array.from({ length: count }, () => makeStar(settings));
      fields.push(field);
    }
  }

  if (fields.length === 0) return;
  if (frame === null) frame = window.requestAnimationFrame(draw);
}

/**
 * A pane changed size. Stars are fractions of the canvas, so they keep their
 * arrangement and only the count moves — a wider pane shows more sky rather than
 * a different one. False means the panes themselves changed and the field has to
 * be built again.
 */
export function resizeStarfield(settings: SkywalkerSettings): boolean {
  if (fields.length === 0) return false;
  if (fields.some((field) => !field.host.isConnected)) return false;

  /* A pane that opened after the last build is a host nobody drew into, and no
     existing field reports it: an empty tab gets no sky until the set is read
     again. Compared against every host the build looked at, so a pane it
     declined to draw into does not force a rebuild on every resize. */
  const hosts = hostsFor(settings);
  if (hosts.length !== covered.length) return false;
  if (hosts.some((host, index) => host !== covered[index])) return false;

  for (const field of fields) {
    measure(field);
    const count = Math.max(wanted(field, settings), 0);
    while (field.stars.length < count) field.stars.push(makeStar(settings));
    if (field.stars.length > count) field.stars.length = count;
  }
  return true;
}

export function removeStarfield(): void {
  for (const field of fields) field.canvas.detach();
  fields.length = 0;
  covered = [];
  if (frame !== null) {
    window.cancelAnimationFrame(frame);
    frame = null;
  }
}
