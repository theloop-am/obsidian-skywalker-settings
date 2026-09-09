/*
 * Skywalker Settings - Plugin for Obsidian
 * Copyright (c) 2026 theLOOP
 * SPDX-License-Identifier: MIT
 */

import {
  addYears,
  differenceInCalendarDays,
  getISODay,
  getISOWeek,
  getISOWeekYear,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns';
import { strings } from './i18n/index';
import { count, decimal } from './i18n/plural';
import type { SkywalkerSettings } from './settings';

/**
 * One cell per week of a life, drawn behind the actions on an empty tab.
 *
 * The grid is rebuilt rather than updated; a signature decides whether it needs
 * to be. Anything the drawing depends on belongs in that signature.
 */

const SELECTOR = '.workspace-leaf-content[data-type="empty"] .empty-state';
const ACTIONS = '.empty-state-container';
const ROOT_CLASS = 'loopsk-lifegrid';
const HOST_CLASS = 'loopsk-lifegrid-host';
const BARE_CLASS = 'loopsk-lifegrid-bare';

const MIN_CELL = 3;
const MAX_CELL = 16;
const GAP_RATIO = 0.3;

const MAX_WIDTH = 900;
const GAP_BELOW = 48;
const BREATHING = 56;
const MIN_BOX = { width: 220, height: 140 };
const DECADE_ROWS = 10;
const DECADE_GAP = 2;

interface Life {
  readonly lived: number;
  readonly total: number;
  readonly years: number;
  readonly day: number;
  readonly week: number;
  readonly weekYear: number;
  readonly weekday: number;
  readonly yearStarts: readonly number[];
}

interface Row {
  readonly start: number;
  readonly length: number;
}

interface Plan {
  readonly cell: number;
  readonly gap: number;
  readonly rows: Row[];
  readonly decades: Map<number, number>;
}

interface Box {
  readonly width: number;
  readonly height: number;
}

interface Panel {
  readonly host: HTMLElement;
  readonly root: HTMLElement;
  readonly signature: string;
}

const panels: Panel[] = [];

function forget(panel: Panel): void {
  panel.root.detach();
  panel.host.removeClass(HOST_CLASS, BARE_CLASS);
}

function drop(panel: Panel): void {
  forget(panel);
  const at = panels.indexOf(panel);
  if (at >= 0) panels.splice(at, 1);
}

export function readLife(settings: SkywalkerSettings): Life | null {
  const parsed = parseISO(settings.lifeGridBirthDate);
  if (!isValid(parsed)) return null;

  const birth = startOfDay(parsed);
  const today = startOfDay(new Date());
  if (differenceInCalendarDays(today, birth) < 0) return null;

  const week = (date: Date): number => Math.floor(differenceInCalendarDays(date, birth) / 7);

  const years = settings.lifeGridYears;
  const yearStarts = Array.from({ length: years + 1 }, (_, year) => week(addYears(birth, year)));

  return {
    lived: week(today),
    total: yearStarts[years] ?? 0,
    years,
    day: differenceInCalendarDays(today, birth) + 1,
    week: getISOWeek(today),
    weekYear: getISOWeekYear(today),
    weekday: getISODay(today),
    yearStarts,
  };
}

function gapFor(cell: number): number {
  return Math.max(1, Math.round(cell * GAP_RATIO));
}

function span(cells: number, cell: number, gap: number): number {
  return cells * (cell + gap) - gap;
}

/** A row per year of life, each starting on the birthday. */
function birthdayRows(life: Life): Row[] {
  const rows: Row[] = [];
  for (let year = 0; year < life.years; year++) {
    const start = life.yearStarts[year];
    const next = life.yearStarts[year + 1];
    if (start === undefined || next === undefined) break;
    rows.push({ start, length: next - start });
  }
  return rows;
}

/** A ribbon: rows of equal length, broken wherever the pane ends. */
function chunkRows(total: number, columns: number): Row[] {
  const rows: Row[] = [];
  for (let start = 0; start < total; start += columns) {
    rows.push({ start, length: Math.min(columns, total - start) });
  }
  return rows;
}

function decadeMarks(life: Life): Map<number, number> {
  const marks = new Map<number, number>();
  for (let year = 10; year < life.years; year += 10) {
    const start = life.yearStarts[year];
    if (start !== undefined) marks.set(start, year);
  }
  return marks;
}

/** The largest cell the grid fits in at, searched down to MIN_CELL. */
export function fit(life: Life, settings: SkywalkerSettings, box: Box): Plan | null {
  if (settings.lifeGridLayout === 'ribbon') {
    const target = Math.min(Math.max(settings.lifeGridCellSize, MIN_CELL), MAX_CELL);
    for (let cell = target; cell >= MIN_CELL; cell--) {
      const gap = gapFor(cell);
      const columns = Math.max(1, Math.floor((box.width + gap) / (cell + gap)));
      const rows = chunkRows(life.total, columns);
      if (span(rows.length, cell, gap) <= box.height || cell === MIN_CELL) {
        return { cell, gap, rows, decades: decadeMarks(life) };
      }
    }
    return null;
  }

  const rows = birthdayRows(life);
  const columns = rows.reduce((widest, row) => Math.max(widest, row.length), 0);
  if (columns === 0) return null;

  const breaks = Math.floor((rows.length - 1) / DECADE_ROWS);

  for (let cell = MAX_CELL; cell >= MIN_CELL; cell--) {
    const gap = gapFor(cell);
    const tall = span(rows.length, cell, gap) + breaks * gap * DECADE_GAP;
    const fits = span(columns, cell, gap) <= box.width && tall <= box.height;
    if (fits || cell === MIN_CELL) {
      return { cell, gap, rows, decades: decadeMarks(life) };
    }
  }
  return null;
}

/** Everything the drawing depends on. Equal signatures mean equal pictures. */
function signature(life: Life, settings: SkywalkerSettings, plan: Plan): string {
  return [
    settings.lifeGridLayout,
    settings.lifeGridStrength,
    settings.lifeGridTextStrength,
    settings.lifeGridCaption ? 'caption' : '',
    settings.lifeGridBareTab ? 'bare' : '',
    settings.lifeGridTintMode,
    settings.lifeGridTint,
    life.lived,
    life.total,
    life.day,
    plan.cell,
    plan.gap,
    plan.rows.length,
  ].join('|');
}

/** ISO 8601 week date, e.g. 2026-W37-2. */
function isoWeekDate(weekYear: number, week: number, weekday: number): string {
  return `${weekYear}-W${String(week).padStart(2, '0')}-${weekday}`;
}

export function caption(life: Life): readonly [string, string, string] {
  const share = Math.round((life.lived / life.total) * 100);

  return [
    strings.lifegrid.flightDay.replace('{day}', decimal(life.day)),
    strings.lifegrid.progress
      .replace('{lived}', decimal(life.lived))
      .replace('{total}', count(life.total, strings.lifegrid.weekCount))
      .replace('{share}', String(share)),
    isoWeekDate(life.weekYear, life.week, life.weekday),
  ];
}

function build(
  host: HTMLElement,
  life: Life,
  settings: SkywalkerSettings,
  plan: Plan,
): HTMLElement {
  const root = createDiv({ cls: ROOT_CLASS });
  /* Decoration: thousands of empty cells are noise to a screen reader. */
  root.setAttribute('aria-hidden', 'true');
  root.style.setProperty('--loopsk-lifegrid-cell', `${plan.cell}px`);
  root.style.setProperty('--loopsk-lifegrid-gap', `${plan.gap}px`);
  root.style.setProperty('--loopsk-lifegrid-strength', `${settings.lifeGridStrength / 100}`);
  root.style.setProperty('--loopsk-lifegrid-text', `${settings.lifeGridTextStrength / 100}`);
  if (settings.lifeGridTintMode === 'accent') root.addClass('mod-accent');
  if (settings.lifeGridTintMode === 'custom') {
    root.addClass('mod-custom');
    root.style.setProperty('--loopsk-lifegrid-tint', settings.lifeGridTint);
  }

  const grid = root.createDiv({ cls: 'loopsk-lifegrid-rows' });
  /* One insertion, so the pane lays out once rather than once per row. */
  const fragment = createFragment();
  const grouped = settings.lifeGridLayout === 'ageyear';

  plan.rows.forEach((row, line) => {
    const rowEl = createDiv({ cls: 'loopsk-lifegrid-row' });
    if (grouped && line > 0 && line % DECADE_ROWS === 0) rowEl.addClass('mod-decade');

    for (let offset = 0; offset < row.length; offset++) {
      const index = row.start + offset;
      if (index >= life.total) break;

      const state = index < life.lived ? 'is-past' : index === life.lived ? 'is-now' : 'is-future';
      const cell = rowEl.createDiv({ cls: `loopsk-lifegrid-cell ${state}` });

      const decade = plan.decades.get(index);
      if (decade !== undefined) {
        cell.addClass('is-decade');
        rowEl.dataset.age = String(decade);
      }
    }
    fragment.appendChild(rowEl);
  });

  grid.appendChild(fragment);

  if (settings.lifeGridCaption) {
    const block = root.createDiv({ cls: 'loopsk-lifegrid-caption' });
    const [day, progress, stamp] = caption(life);
    block.createDiv({ cls: 'loopsk-lifegrid-day', text: day });
    block.createDiv({ cls: 'loopsk-lifegrid-progress', text: progress });
    block.createDiv({ cls: 'loopsk-lifegrid-stamp', text: stamp });
  }

  host.insertBefore(root, host.querySelector(ACTIONS));
  return root;
}

/** The space the calendar may occupy, once the tab's own actions have theirs. */
function boxFor(host: HTMLElement, settings: SkywalkerSettings): Box {
  const view = host.closest<HTMLElement>('.view-content')?.getBoundingClientRect();
  const rect = view ?? host.getBoundingClientRect();
  const bare = settings.lifeGridBareTab;
  const actions = bare ? 0 : (host.querySelector(ACTIONS)?.getBoundingClientRect().height ?? 0);

  return {
    width: Math.min(rect.width * (settings.lifeGridWidth / 100), MAX_WIDTH),
    height: rect.height - actions - (bare ? 0 : GAP_BELOW) - BREATHING * 2,
  };
}

export function renderLifeGrid(settings: SkywalkerSettings): void {
  const life = settings.lifeGridEnabled ? readLife(settings) : null;
  if (life === null || life.total < 1) {
    removeLifeGrid();
    return;
  }

  const hosts = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));

  for (const panel of [...panels]) {
    if (!hosts.includes(panel.host) || !panel.root.isConnected) drop(panel);
  }

  for (const host of hosts) {
    const box = boxFor(host, settings);
    const existing = panels.find((panel) => panel.host === host);
    const plan =
      box.width < MIN_BOX.width || box.height < MIN_BOX.height ? null : fit(life, settings, box);

    if (plan === null) {
      if (existing !== undefined) drop(existing);
      continue;
    }

    const mark = signature(life, settings, plan);
    if (existing !== undefined) {
      if (existing.signature === mark) continue;
      drop(existing);
    }

    host.addClass(HOST_CLASS);
    host.toggleClass(BARE_CLASS, settings.lifeGridBareTab);
    panels.push({ host, root: build(host, life, settings, plan), signature: mark });
  }
}

export function removeLifeGrid(): void {
  for (const panel of panels) forget(panel);
  panels.length = 0;
}
