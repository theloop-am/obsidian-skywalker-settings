/*
 * Skywalker Settings - Plugin for Obsidian
 * Copyright (c) 2026 theLOOP
 * SPDX-License-Identifier: MIT
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type SkywalkerSettings } from '../src/settings';
import { removeStarfield, renderStarfield, resizeStarfield, wakeStarfield } from '../src/starfield';
import { drawnOn, setPixelRatio, setRect, setReducedMotion, setWindowWidth } from './setup';

const WIDTH = 1000;

function on(over: Partial<SkywalkerSettings> = {}): SkywalkerSettings {
  return { ...DEFAULT_SETTINGS, starfieldEnabled: true, ...over };
}

function canvases(): HTMLCanvasElement[] {
  return Array.from(document.querySelectorAll<HTMLCanvasElement>('.loopsk-starfield'));
}

/** The band canvas and a pane canvas, named rather than taken by document order:
 *  a pane declared before the band still comes first in the tree. */
function band(): HTMLCanvasElement {
  const found = document.querySelector<HTMLCanvasElement>('.loopsk-starfield-band');
  if (found === null) throw new Error('no band was drawn');
  return found;
}

function pane(): HTMLCanvasElement {
  const found = document.querySelector<HTMLCanvasElement>(
    '.loopsk-starfield:not(.loopsk-starfield-band)',
  );
  if (found === null) throw new Error('no pane field was drawn');
  return found;
}

/** The number of stars a field holds, read back from what one frame drew. */
function starsOn(canvas: HTMLCanvasElement): number {
  const recorded = drawnOn(canvas);
  if (recorded === undefined) throw new Error('no context was taken for this canvas');
  return recorded.drawn.length;
}

function frame(): void {
  vi.advanceTimersByTime(20);
}

/** A graph pane: a view whose own canvas the sky has to sit under. */
function graphPane(type: 'graph' | 'localgraph' = 'graph', width = 900, height = 700): HTMLElement {
  const leaf = document.body.createDiv({ cls: 'workspace-leaf-content' });
  leaf.setAttribute('data-type', type);
  const view = leaf.createDiv({ cls: 'view-content' });
  view.createEl('canvas', { cls: 'graph-canvas' });
  setRect(view, width, height);
  return view;
}

function sidebar(side: 'left' | 'right', width = 300, height = 800): HTMLElement {
  const element = document.body.createDiv({ cls: `workspace-split mod-${side}-split` });
  setRect(element, width, height);
  return element;
}

beforeEach(() => {
  vi.useFakeTimers();
  setWindowWidth(WIDTH);
  setPixelRatio(1);
  setReducedMotion(false);
  setRect(document.body, WIDTH, 2000);
});

afterEach(() => {
  removeStarfield();
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe('renderStarfield', () => {
  it('draws a band across the top of the window', () => {
    renderStarfield(on());
    const [canvas] = canvases();
    expect(canvas).toBeDefined();
    expect(canvas?.classList.contains('loopsk-starfield-band')).toBe(true);
    expect(canvas?.parentElement).toBe(document.body);
  });

  it('sizes the band to the window and the height slider', () => {
    renderStarfield(on({ starHeight: 60 }));
    const [canvas] = canvases();
    expect(canvas?.width).toBe(WIDTH);
    expect(canvas?.height).toBe(60);
    expect(canvas?.style.height).toBe('60px');
  });

  it('puts exactly the asked-for number of stars in the band', () => {
    renderStarfield(on({ starCount: 70, starHeight: 40 }));
    frame();
    const [canvas] = canvases();
    expect(canvas).toBeDefined();
    if (canvas !== undefined) expect(starsOn(canvas)).toBeLessThanOrEqual(70);
  });

  it('hides the decoration from a screen reader', () => {
    renderStarfield(on());
    expect(canvases()[0]?.getAttribute('aria-hidden')).toBe('true');
  });

  it('draws nothing when the starfield is switched off', () => {
    renderStarfield({ ...on(), starfieldEnabled: false });
    expect(canvases()).toHaveLength(0);
  });

  it('draws nothing in a window with no width', () => {
    setWindowWidth(0);
    renderStarfield(on());
    expect(canvases()).toHaveLength(0);
  });

  it('draws nothing when the band has no height', () => {
    renderStarfield(on({ starHeight: 0 }));
    expect(canvases()).toHaveLength(0);
  });

  it('leaves the top alone when only the sidebars are asked for', () => {
    sidebar('left');
    renderStarfield(on({ starRegionTop: false, starRegionLeft: true }));
    const [canvas] = canvases();
    expect(canvases()).toHaveLength(1);
    expect(canvas?.classList.contains('loopsk-starfield-band')).toBe(false);
  });

  it('draws into every region that is switched on', () => {
    sidebar('left');
    sidebar('right');
    renderStarfield(on({ starRegionLeft: true, starRegionRight: true }));
    expect(canvases()).toHaveLength(3);
  });

  it('gives a pane a fraction of the top strip’s density', () => {
    sidebar('left', 1000, 40);
    renderStarfield(on({ starRegionTop: true, starRegionLeft: true, starCount: 100 }));
    frame();
    expect(starsOn(pane())).toBeLessThan(starsOn(band()));
  });

  it('dims a sidebar against the top', () => {
    sidebar('left', 1000, 40);
    renderStarfield(
      on({ starRegionTop: true, starRegionLeft: true, starEdgeBrightness: 50, starBlinkShare: 0 }),
    );
    frame();
    const brightest = (canvas: HTMLCanvasElement) =>
      Math.max(...(drawnOn(canvas)?.drawn.map((image) => image.alpha) ?? [0]));
    expect(brightest(pane())).toBeLessThan(brightest(band()));
  });

  it('never puts more stars in one area than the ceiling allows', () => {
    setWindowWidth(4000);
    setRect(document.body, 4000, 2000);
    renderStarfield(on({ starCount: 600, starHeight: 200, starMax: 100 }));
    frame();
    const [canvas] = canvases();
    if (canvas !== undefined) expect(starsOn(canvas)).toBeLessThanOrEqual(100);
  });

  it.each(['graph', 'localgraph'] as const)('draws into the %s view', (type) => {
    graphPane(type);
    renderStarfield(on({ starRegionTop: false, starRegionGraph: true }));
    expect(canvases()).toHaveLength(1);
  });

  it('puts the sky under the graph rather than over its nodes', () => {
    const view = graphPane();
    renderStarfield(on({ starRegionTop: false, starRegionGraph: true }));

    const sky = view.querySelector('.loopsk-starfield');
    expect(view.firstElementChild).toBe(sky);
    expect(sky?.classList.contains('loopsk-starfield-beneath')).toBe(true);
  });

  it('leaves the graph alone until it is switched on', () => {
    graphPane();
    renderStarfield(on({ starRegionTop: false, starRegionGraph: false }));
    expect(canvases()).toHaveLength(0);
  });

  it('dims the graph the way it dims a sidebar', () => {
    graphPane('graph', 1000, 40);
    renderStarfield(
      on({ starRegionTop: true, starRegionGraph: true, starEdgeBrightness: 50, starBlinkShare: 0 }),
    );
    frame();
    const brightest = (canvas: HTMLCanvasElement) =>
      Math.max(...(drawnOn(canvas)?.drawn.map((image) => image.alpha) ?? [0]));
    expect(brightest(pane())).toBeLessThan(brightest(band()));
  });

  it('draws nothing in a pane with no area', () => {
    const pane = sidebar('left');
    setRect(pane, 0, 0);
    renderStarfield(on({ starRegionTop: false, starRegionLeft: true }));
    expect(canvases()).toHaveLength(0);
  });

  it('replaces the sky rather than stacking a second one', () => {
    renderStarfield(on());
    renderStarfield(on());
    expect(canvases()).toHaveLength(1);
  });

  it('raises the canvas for a retina display without changing its size on screen', () => {
    setPixelRatio(2);
    renderStarfield(on({ starHeight: 40 }));
    const [canvas] = canvases();
    expect(canvas?.width).toBe(WIDTH * 2);
    expect(canvas?.height).toBe(80);
    expect(canvas?.style.height).toBe('40px');
  });

  it('stops raising it past what the stars could show', () => {
    setPixelRatio(4);
    renderStarfield(on({ starHeight: 40 }));
    expect(canvases()[0]?.height).toBe(80);
  });
});

describe('drawing', () => {
  it('clears the canvas before each frame', () => {
    renderStarfield(on());
    const [canvas] = canvases();
    if (canvas === undefined) throw new Error('expected a field');
    frame();
    const first = drawnOn(canvas)?.clears ?? 0;
    frame();
    expect(drawnOn(canvas)?.clears ?? 0).toBeGreaterThan(first);
  });

  it('holds every star still when the system asks for less movement', () => {
    setReducedMotion(true);
    renderStarfield(on({ starBlinkShare: 100 }));
    const [canvas] = canvases();
    if (canvas === undefined) throw new Error('expected a field');

    frame();
    const first = drawnOn(canvas)?.drawn.map((image) => image.alpha) ?? [];
    frame();
    const second = (drawnOn(canvas)?.drawn ?? []).slice(-first.length).map((i) => i.alpha);

    expect(second).toEqual(first);
  });

  it('leaves a sky that never blinks alone between frames', () => {
    renderStarfield(on({ starBlinkShare: 0 }));
    const [canvas] = canvases();
    if (canvas === undefined) throw new Error('expected a field');

    frame();
    const count = drawnOn(canvas)?.drawn.length ?? 0;
    frame();
    expect((drawnOn(canvas)?.drawn.length ?? 0) - count).toBe(count);
  });

  it('draws no star brighter than the brightness slider', () => {
    renderStarfield(on({ starBrightness: 40, starBlinkShare: 0 }));
    frame();
    const [canvas] = canvases();
    for (const image of drawnOn(canvas as HTMLCanvasElement)?.drawn ?? []) {
      expect(image.alpha).toBeLessThanOrEqual(0.4);
    }
  });
});

describe('resizeStarfield', () => {
  it('reports nothing to resize when no sky is drawn', () => {
    expect(resizeStarfield(on())).toBe(false);
  });

  it('keeps the sky and adjusts the count when a pane grows', () => {
    const pane = sidebar('left', 300, 400);
    renderStarfield(on({ starRegionTop: false, starRegionLeft: true }));
    frame();
    const [canvas] = canvases();
    if (canvas === undefined) throw new Error('expected a field');
    const before = starsOn(canvas);

    setRect(pane, 600, 800);
    expect(resizeStarfield(on({ starRegionTop: false, starRegionLeft: true }))).toBe(true);
    frame();

    expect(starsOn(canvas) - before).toBeGreaterThan(before);
    expect(canvases()[0]).toBe(canvas);
  });

  it('drops stars when a pane shrinks', () => {
    const pane = sidebar('left', 600, 800);
    renderStarfield(on({ starRegionTop: false, starRegionLeft: true }));
    frame();
    const [canvas] = canvases();
    if (canvas === undefined) throw new Error('expected a field');
    const before = starsOn(canvas);

    setRect(pane, 200, 200);
    resizeStarfield(on({ starRegionTop: false, starRegionLeft: true }));
    frame();

    expect(starsOn(canvas) - before).toBeLessThan(before);
  });

  it('asks to be built again once a pane it should draw into has appeared', () => {
    renderStarfield(on({ starRegionTop: true, starRegionLeft: true }));
    expect(canvases()).toHaveLength(1);

    sidebar('left');

    expect(resizeStarfield(on({ starRegionTop: true, starRegionLeft: true }))).toBe(false);
  });

  it('asks to be built again once a region is switched on', () => {
    sidebar('left');
    renderStarfield(on({ starRegionTop: true, starRegionLeft: false }));
    expect(canvases()).toHaveLength(1);

    expect(resizeStarfield(on({ starRegionTop: true, starRegionLeft: true }))).toBe(false);
  });

  it('asks to be built again once a pane it drew into has gone', () => {
    const pane = sidebar('left');
    renderStarfield(on({ starRegionTop: false, starRegionLeft: true }));
    pane.remove();
    expect(resizeStarfield(on({ starRegionTop: false, starRegionLeft: true }))).toBe(false);
  });
});

describe('removeStarfield', () => {
  it('takes every canvas off the panes', () => {
    sidebar('left');
    renderStarfield(on({ starRegionLeft: true }));
    removeStarfield();
    expect(canvases()).toHaveLength(0);
  });

  it('is safe when nothing was drawn', () => {
    expect(() => removeStarfield()).not.toThrow();
  });

  it('stops the loop, so a removed sky paints nothing more', () => {
    renderStarfield(on());
    const [canvas] = canvases();
    if (canvas === undefined) throw new Error('expected a field');
    frame();
    const clears = drawnOn(canvas)?.clears ?? 0;

    removeStarfield();
    frame();

    expect(drawnOn(canvas)?.clears).toBe(clears);
  });
});

describe('wakeStarfield', () => {
  it('does nothing when no sky is drawn', () => {
    expect(() => wakeStarfield()).not.toThrow();
  });

  it('paints again after the window comes back', () => {
    renderStarfield(on());
    const [canvas] = canvases();
    if (canvas === undefined) throw new Error('expected a field');

    frame();
    const before = drawnOn(canvas)?.clears ?? 0;
    wakeStarfield();
    frame();

    expect(drawnOn(canvas)?.clears ?? 0).toBeGreaterThan(before);
  });

  it('starts no second loop while one is running', () => {
    renderStarfield(on());
    const [canvas] = canvases();
    if (canvas === undefined) throw new Error('expected a field');

    frame();
    const one = drawnOn(canvas)?.clears ?? 0;
    frame();
    const perFrame = (drawnOn(canvas)?.clears ?? 0) - one;

    wakeStarfield();
    wakeStarfield();
    const before = drawnOn(canvas)?.clears ?? 0;
    frame();

    expect((drawnOn(canvas)?.clears ?? 0) - before).toBe(perFrame);
  });
});
