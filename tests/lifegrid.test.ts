/*
 * Skywalker Settings - Plugin for Obsidian
 * Copyright (c) 2026 theLOOP
 * SPDX-License-Identifier: MIT
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { caption, fit, readLife, removeLifeGrid, renderLifeGrid } from '../src/lifegrid';
import { DEFAULT_SETTINGS, type SkywalkerSettings } from '../src/settings';
import { setRect } from './setup';

const TODAY = new Date('2026-09-09T12:00:00');
const BIRTH = '1984-06-01';

function dated(over: Partial<SkywalkerSettings> = {}): SkywalkerSettings {
  return { ...DEFAULT_SETTINGS, lifeGridEnabled: true, lifeGridBirthDate: BIRTH, ...over };
}

function life(settings: SkywalkerSettings = dated()) {
  const read = readLife(settings);
  if (read === null) throw new Error('expected a readable life');
  return read;
}

/** The pane an empty tab actually is: a view holding an empty state and the
 *  buttons the tab offers. */
function emptyTab(width = 1200, height = 900, actions = 120): HTMLElement {
  const leaf = document.body.createDiv({ cls: 'workspace-leaf-content' });
  leaf.setAttribute('data-type', 'empty');
  const view = leaf.createDiv({ cls: 'view-content' });
  const state = view.createDiv({ cls: 'empty-state' });
  const container = state.createDiv({ cls: 'empty-state-container' });
  setRect(view, width, height);
  setRect(state, width, height);
  setRect(container, width, actions);
  return state;
}

function grids(): NodeListOf<HTMLElement> {
  return document.querySelectorAll<HTMLElement>('.loopsk-lifegrid');
}

function cells(root: HTMLElement): number {
  return root.querySelectorAll('.loopsk-lifegrid-cell').length;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(TODAY);
});

afterEach(() => {
  removeLifeGrid();
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe('readLife', () => {
  it('counts the weeks and days since the birthday', () => {
    const read = life();
    expect(read.day).toBe(15441);
    expect(read.lived).toBe(Math.floor(15440 / 7));
    expect(read.years).toBe(DEFAULT_SETTINGS.lifeGridYears);
  });

  it('spans the years the slider asks for', () => {
    expect(life(dated({ lifeGridYears: 40 })).yearStarts).toHaveLength(41);
  });

  it('reads the ISO week the day falls in', () => {
    const read = life();
    expect(read.weekYear).toBe(2026);
    expect(read.week).toBe(37);
    expect(read.weekday).toBe(3);
  });

  it('refuses a date that is not a date', () => {
    expect(readLife(dated({ lifeGridBirthDate: 'not-a-date' }))).toBeNull();
  });

  it('refuses an unset date', () => {
    expect(readLife(dated({ lifeGridBirthDate: '' }))).toBeNull();
  });

  it('refuses a birthday in the future', () => {
    expect(readLife(dated({ lifeGridBirthDate: '2030-01-01' }))).toBeNull();
  });

  it('accepts a birthday of today, which is day one', () => {
    const read = readLife(dated({ lifeGridBirthDate: '2026-09-09' }));
    expect(read?.day).toBe(1);
    expect(read?.lived).toBe(0);
  });

  it('starts each year on the birthday, so rows run 52 or 53 weeks', () => {
    const read = life();
    for (let year = 0; year < read.years; year++) {
      const start = read.yearStarts[year];
      const next = read.yearStarts[year + 1];
      expect(next === undefined || start === undefined ? 52 : next - start).toBeGreaterThanOrEqual(52);
      expect(next === undefined || start === undefined ? 53 : next - start).toBeLessThanOrEqual(53);
    }
  });
});

describe('fit', () => {
  const box = { width: 660, height: 700 };

  it('lays a row per year out', () => {
    const plan = fit(life(), dated(), box);
    expect(plan?.rows).toHaveLength(DEFAULT_SETTINGS.lifeGridYears);
  });

  it('marks every tenth year', () => {
    const plan = fit(life(), dated(), box);
    expect([...(plan?.decades.values() ?? [])]).toEqual([10, 20, 30, 40, 50, 60, 70, 80]);
  });

  it('wraps a ribbon to the width it is given', () => {
    const plan = fit(life(), dated({ lifeGridLayout: 'ribbon' }), box);
    const widths = new Set(plan?.rows.slice(0, -1).map((row) => row.length));
    expect(widths.size).toBe(1);
  });

  it('covers every week exactly once, whichever layout is chosen', () => {
    for (const layout of ['ageyear', 'ribbon'] as const) {
      const read = life();
      const plan = fit(read, dated({ lifeGridLayout: layout }), box);
      const total = plan?.rows.reduce((sum, row) => sum + row.length, 0) ?? 0;
      expect(total).toBe(read.total);
    }
  });

  it('shrinks the cell rather than overflowing a short pane', () => {
    const tall = fit(life(), dated(), { width: 660, height: 900 });
    const short = fit(life(), dated(), { width: 660, height: 260 });
    expect(short?.cell).toBeLessThan(tall?.cell ?? 0);
  });

  it('stops shrinking at the smallest cell worth drawing', () => {
    const plan = fit(life(), dated(), { width: 40, height: 40 });
    expect(plan?.cell).toBe(3);
  });

  it('honours the ribbon cell size when the pane allows it', () => {
    const plan = fit(life(), dated({ lifeGridLayout: 'ribbon', lifeGridCellSize: 12 }), {
      width: 1600,
      height: 800,
    });
    expect(plan?.cell).toBe(12);
  });

  it('never draws a ribbon cell larger than the slider asks for', () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 16 }), (asked) => {
        const plan = fit(life(), dated({ lifeGridLayout: 'ribbon', lifeGridCellSize: asked }), {
          width: 4000,
          height: 4000,
        });
        expect(plan?.cell).toBe(asked);
      }),
    );
  });

  it('never plans a gap smaller than a pixel', () => {
    fc.assert(
      fc.property(fc.integer({ min: 50, max: 2000 }), fc.integer({ min: 50, max: 2000 }), (w, h) => {
        for (const layout of ['ageyear', 'ribbon'] as const) {
          const plan = fit(life(), dated({ lifeGridLayout: layout }), { width: w, height: h });
          if (plan !== null) expect(plan.gap).toBeGreaterThanOrEqual(1);
        }
      }),
    );
  });

  it('has nothing to lay out when the span is a single year', () => {
    const read = { ...life(), years: 0, yearStarts: [0], total: 0 };
    expect(fit(read, dated(), box)).toBeNull();
  });
});

describe('caption', () => {
  it('gives the flight day, the progress and the ISO week', () => {
    const [day, progress, stamp] = caption(life());
    expect(day).toBe(`Flight day ${(15441).toLocaleString('en')}`);
    expect(progress).toMatch(/^[\d,]+ of [\d,]+ weeks · \d+%$/);
    expect(stamp).toBe('2026-W37-3');
  });

  it('pads a single-digit week to two places', () => {
    vi.setSystemTime(new Date('2026-01-07T12:00:00'));
    expect(caption(life())[2]).toBe('2026-W02-3');
  });
});

describe('renderLifeGrid', () => {
  it('draws one grid per empty tab', () => {
    emptyTab();
    emptyTab();
    renderLifeGrid(dated());
    expect(grids()).toHaveLength(2);
  });

  it('draws a cell for every week of the span', () => {
    emptyTab();
    renderLifeGrid(dated());
    const root = grids()[0];
    expect(root).toBeDefined();
    if (root !== undefined) expect(cells(root)).toBe(life().total);
  });

  it('marks the weeks behind, the week in progress and the weeks ahead', () => {
    emptyTab();
    renderLifeGrid(dated());
    const root = grids()[0];
    expect(root?.querySelectorAll('.is-now')).toHaveLength(1);
    expect(root?.querySelectorAll('.is-past')).toHaveLength(life().lived);
  });

  it('draws behind the tab actions rather than after them', () => {
    const state = emptyTab();
    renderLifeGrid(dated());
    expect(state.firstElementChild?.classList.contains('loopsk-lifegrid')).toBe(true);
  });

  it('hides the decoration from a screen reader', () => {
    emptyTab();
    renderLifeGrid(dated());
    expect(grids()[0]?.getAttribute('aria-hidden')).toBe('true');
  });

  it('writes the caption when it is switched on', () => {
    emptyTab();
    renderLifeGrid(dated({ lifeGridCaption: true }));
    expect(grids()[0]?.querySelectorAll('.loopsk-lifegrid-caption > *')).toHaveLength(3);
  });

  it('leaves the caption out when it is switched off', () => {
    emptyTab();
    renderLifeGrid(dated({ lifeGridCaption: false }));
    expect(grids()[0]?.querySelector('.loopsk-lifegrid-caption')).toBeNull();
  });

  it('draws nothing when the calendar is switched off', () => {
    emptyTab();
    renderLifeGrid({ ...dated(), lifeGridEnabled: false });
    expect(grids()).toHaveLength(0);
  });

  it('draws nothing before a birth date is set', () => {
    emptyTab();
    renderLifeGrid(dated({ lifeGridBirthDate: '' }));
    expect(grids()).toHaveLength(0);
  });

  it('draws nothing in a pane too small to hold a calendar', () => {
    emptyTab(180, 120, 40);
    renderLifeGrid(dated());
    expect(grids()).toHaveLength(0);
  });

  it('marks the host so the stylesheet can reach it', () => {
    const state = emptyTab();
    renderLifeGrid(dated());
    expect(state.classList.contains('loopsk-lifegrid-host')).toBe(true);
  });

  it('marks the host bare only when the tab actions are hidden', () => {
    const state = emptyTab();
    renderLifeGrid(dated({ lifeGridBareTab: true }));
    expect(state.classList.contains('loopsk-lifegrid-bare')).toBe(true);
  });

  it('carries the tint the settings asked for', () => {
    emptyTab();
    renderLifeGrid(dated({ lifeGridTintMode: 'accent' }));
    expect(grids()[0]?.classList.contains('mod-accent')).toBe(true);
  });

  it('carries a colour of its own when one is chosen', () => {
    emptyTab();
    renderLifeGrid(dated({ lifeGridTintMode: 'custom', lifeGridTint: '#ff0000' }));
    const root = grids()[0];
    expect(root?.classList.contains('mod-custom')).toBe(true);
    expect(root?.style.getPropertyValue('--loopsk-lifegrid-tint')).toBe('#ff0000');
  });

  it('keeps the grid it has when nothing it draws from changed', () => {
    emptyTab();
    renderLifeGrid(dated());
    const first = grids()[0];
    renderLifeGrid(dated());
    expect(grids()[0]).toBe(first);
  });

  it('rebuilds when a setting it draws from changes', () => {
    emptyTab();
    renderLifeGrid(dated());
    const first = grids()[0];
    renderLifeGrid(dated({ lifeGridStrength: 90 }));
    expect(grids()[0]).not.toBe(first);
    expect(grids()).toHaveLength(1);
  });

  it('lets go of a pane that has closed', () => {
    const state = emptyTab();
    renderLifeGrid(dated());
    state.closest('.workspace-leaf-content')?.remove();
    renderLifeGrid(dated());
    expect(grids()).toHaveLength(0);
  });

  it('takes its grid away when a pane shrinks below what it can hold', () => {
    const state = emptyTab();
    renderLifeGrid(dated());
    expect(grids()).toHaveLength(1);

    const view = state.closest<HTMLElement>('.view-content');
    if (view !== null) setRect(view, 100, 100);
    setRect(state, 100, 100);
    renderLifeGrid(dated());

    expect(grids()).toHaveLength(0);
  });
});

describe('removeLifeGrid', () => {
  it('takes every grid and every mark off the panes', () => {
    const state = emptyTab();
    renderLifeGrid(dated());

    removeLifeGrid();

    expect(grids()).toHaveLength(0);
    expect(state.classList.contains('loopsk-lifegrid-host')).toBe(false);
  });

  it('is safe when nothing was drawn', () => {
    expect(() => removeLifeGrid()).not.toThrow();
  });
});
