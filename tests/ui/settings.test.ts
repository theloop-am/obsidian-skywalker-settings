/*
 * Skywalker Settings - Plugin for Obsidian
 * Copyright (c) 2026 theLOOP
 * SPDX-License-Identifier: MIT
 */

import type {
  App as ObsidianApp,
  Setting as ObsidianSetting,
  SettingDefinitionItem,
} from 'obsidian';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { strings } from '../../src/i18n/index';
import { CUSTOM_PRESET, PRESET_KEYS, PRESETS } from '../../src/presets';
import { DEFAULT_SETTINGS, RANGES, type SkywalkerSettings } from '../../src/settings';
import { removeStarfield } from '../../src/starfield';
import { type SettingsHost, SkywalkerSettingTab, todayISO } from '../../src/ui/settings';
import { App, Plugin, Setting } from '../stubs/obsidian';

class Host extends Plugin {
  override settings: SkywalkerSettings = { ...DEFAULT_SETTINGS };
  saved = 0;

  async saveSettings(): Promise<void> {
    this.saved++;
  }
}

function screen(over: Partial<SkywalkerSettings> = {}) {
  const app = new App();
  const host = new Host(app);
  host.settings = { ...DEFAULT_SETTINGS, ...over };
  /* The stub counts redraws; the real type has no such thing. */
  const tab = new SkywalkerSettingTab(
    app as unknown as ObsidianApp,
    host as unknown as SettingsHost,
  ) as SkywalkerSettingTab & { updates: number };
  return { host, tab };
}

/** Every row the screen declares, groups flattened, hidden rows dropped. */
function rows(items: SettingDefinitionItem[]): SettingDefinitionItem[] {
  const shown = (item: { visible?: boolean | (() => boolean) }): boolean => {
    if (item.visible === undefined) return true;
    return typeof item.visible === 'function' ? item.visible() : item.visible;
  };

  const out: SettingDefinitionItem[] = [];
  for (const item of items) {
    if (!shown(item)) continue;
    if ('items' in item && item.items !== undefined) out.push(...rows(item.items));
    else out.push(item);
  }
  return out;
}

function names(items: SettingDefinitionItem[]): string[] {
  return rows(items).map((item) => ('name' in item ? item.name : ''));
}

function keys(items: SettingDefinitionItem[]): string[] {
  return rows(items).flatMap((item) =>
    'control' in item && item.control !== undefined ? [item.control.key] : [],
  );
}

afterEach(() => {
  removeStarfield();
  document.body.replaceChildren();
});

describe('todayISO', () => {
  it.each([
    ['2026-09-09T12:00:00', '2026-09-09'],
    ['2026-01-01T00:30:00', '2026-01-01'],
    ['1999-12-31T23:59:00', '1999-12-31'],
  ])('writes %s as %s', (now, expected) => {
    expect(todayISO(new Date(now))).toBe(expected);
  });

  it('pads a single-digit month and day', () => {
    expect(todayISO(new Date('2026-03-07T12:00:00'))).toMatch(/^\d{4}-03-07$/);
  });

  it('reads the clock when it is given nothing', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-09T12:00:00'));
    expect(todayISO()).toBe('2026-09-09');
    vi.useRealTimers();
  });
});

describe('getControlValue', () => {
  it('reads every setting the screen can drive', () => {
    const { host, tab } = screen();
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      expect(tab.getControlValue(key)).toBe(host.settings[key as keyof SkywalkerSettings]);
    }
  });

  it('reads nothing for a key the plugin does not own', () => {
    const { tab } = screen();
    expect(tab.getControlValue('somethingElse')).toBeUndefined();
  });
});

describe('setControlValue', () => {
  it('stores the value and saves once', async () => {
    const { host, tab } = screen();
    await tab.setControlValue('starHeight', 120);
    expect(host.settings.starHeight).toBe(120);
    expect(host.saved).toBe(1);
  });

  it('redraws the screen, so a row that appeared is shown', async () => {
    const { tab } = screen();
    await tab.setControlValue('starRegionLeft', true);
    expect(tab.updates).toBe(1);
  });

  it('refuses a key the screen never declared', async () => {
    const { host, tab } = screen();
    await tab.setControlValue('injected', 'value');
    expect('injected' in host.settings).toBe(false);
    expect(host.saved).toBe(0);
  });

  it.each(PRESETS)('applies every value $id owns when it is chosen', async (preset) => {
    const { host, tab } = screen();
    await tab.setControlValue('starPreset', preset.id);
    for (const key of PRESET_KEYS) expect(host.settings[key]).toBe(preset.values[key]);
  });

  it('leaves the sliders alone when Custom is chosen', async () => {
    const { host, tab } = screen({ starCount: 123 });
    await tab.setControlValue('starPreset', CUSTOM_PRESET);
    expect(host.settings.starCount).toBe(123);
    expect(host.settings.starPreset).toBe(CUSTOM_PRESET);
  });

  it.each(PRESET_KEYS)('drops to Custom once %s is moved off the preset', async (key) => {
    const { host, tab } = screen();
    await tab.setControlValue(key, DEFAULT_SETTINGS[key] + 5);
    expect(host.settings.starPreset).toBe(CUSTOM_PRESET);
  });

  it('stays on the preset when a slider is set back to what it already was', async () => {
    const { host, tab } = screen();
    await tab.setControlValue('starCount', DEFAULT_SETTINGS.starCount);
    expect(host.settings.starPreset).toBe(DEFAULT_SETTINGS.starPreset);
  });

  it('stays on the preset when a slider no preset owns is moved', async () => {
    const { host, tab } = screen();
    await tab.setControlValue('starHeight', 180);
    expect(host.settings.starPreset).toBe(DEFAULT_SETTINGS.starPreset);
  });
});

describe('the settings screen', () => {
  it('opens with a group for each part of the plugin', () => {
    const { tab } = screen();
    const headings = tab
      .getSettingDefinitions()
      .flatMap((item) => ('heading' in item && item.heading !== undefined ? [item.heading] : []));
    expect(headings).toEqual([
      strings.starfield.heading,
      strings.sky.heading,
      strings.twinkle.heading,
      strings.colour.heading,
      strings.lifegrid.heading,
      strings.logos.heading,
    ]);
  });

  it('drives only settings the plugin owns', () => {
    const { tab } = screen();
    for (const key of keys(tab.getSettingDefinitions())) expect(key in DEFAULT_SETTINGS).toBe(true);
  });

  it('gives every row a name', () => {
    const { tab } = screen();
    for (const name of names(tab.getSettingDefinitions())) expect(name).not.toBe('');
  });

  it('draws every slider at the extent the stored value is held to', () => {
    const { tab } = screen({ starPreset: CUSTOM_PRESET, lifeGridBirthDate: '1984-06-01' });
    for (const item of rows(tab.getSettingDefinitions())) {
      if (!('control' in item) || item.control?.type !== 'slider') continue;
      const range = RANGES[item.control.key as keyof typeof RANGES];
      expect({ min: item.control.min, max: item.control.max, step: item.control.step }).toEqual(
        range,
      );
    }
  });

  /* By key, not by name: "Stars" is the count under Sky and the colour under
     Star color, and only their heading tells the two rows apart. */
  it('hides every slider a preset owns until Custom is chosen', () => {
    const preset = keys(screen().tab.getSettingDefinitions());
    const custom = keys(screen({ starPreset: CUSTOM_PRESET }).tab.getSettingDefinitions());
    for (const key of PRESET_KEYS) {
      expect(preset).not.toContain(key);
      expect(custom).toContain(key);
    }
  });

  it('hides the sidebar brightness until a sidebar is switched on', () => {
    expect(names(screen().tab.getSettingDefinitions())).not.toContain(
      strings.starfield.edgeBrightness,
    );
    expect(names(screen({ starRegionRight: true }).tab.getSettingDefinitions())).toContain(
      strings.starfield.edgeBrightness,
    );
  });

  it('asks for a birth date before it offers anything else about the calendar', () => {
    const shown = names(screen({ lifeGridEnabled: true }).tab.getSettingDefinitions());
    expect(shown).toContain(strings.lifegrid.birth);
    expect(shown).not.toContain(strings.lifegrid.years);
  });

  it('offers the rest of the calendar once a date is set', () => {
    const shown = names(
      screen({
        lifeGridEnabled: true,
        lifeGridBirthDate: '1984-06-01',
      }).tab.getSettingDefinitions(),
    );
    expect(shown).toContain(strings.lifegrid.years);
    expect(shown).toContain(strings.lifegrid.layout);
  });

  it('offers the cell size only for the ribbon, which is the layout that uses it', () => {
    const dated = { lifeGridEnabled: true, lifeGridBirthDate: '1984-06-01' } as const;
    expect(names(screen({ ...dated }).tab.getSettingDefinitions())).not.toContain(
      strings.lifegrid.cell,
    );
    expect(
      names(screen({ ...dated, lifeGridLayout: 'ribbon' }).tab.getSettingDefinitions()),
    ).toContain(strings.lifegrid.cell);
  });

  it('offers a colour of your own only when that is what was chosen', () => {
    const dated = { lifeGridEnabled: true, lifeGridBirthDate: '1984-06-01' } as const;
    expect(names(screen({ ...dated }).tab.getSettingDefinitions())).not.toContain(
      strings.lifegrid.custom,
    );
    expect(
      names(screen({ ...dated, lifeGridTintMode: 'custom' }).tab.getSettingDefinitions()),
    ).toContain(strings.lifegrid.custom);
  });

  it('offers the caption strength only while there is a caption', () => {
    const dated = { lifeGridEnabled: true, lifeGridBirthDate: '1984-06-01' } as const;
    expect(
      names(screen({ ...dated, lifeGridCaption: false }).tab.getSettingDefinitions()),
    ).not.toContain(strings.lifegrid.captionStrength);
    expect(
      names(screen({ ...dated, lifeGridCaption: true }).tab.getSettingDefinitions()),
    ).toContain(strings.lifegrid.captionStrength);
  });

  it('says Off rather than a distance when parallax is at zero', () => {
    const { tab } = screen();
    const drift = rows(tab.getSettingDefinitions()).find(
      (item) => 'control' in item && item.control?.key === 'starDrift',
    );
    const format =
      drift !== undefined && 'control' in drift && drift.control?.type === 'slider'
        ? drift.control.displayFormat
        : undefined;
    expect(format?.(0)).toBe(strings.starfield.driftOff);
    expect(format?.(12)).toBe('12px');
  });

  it('counts the years the calendar spans in words', () => {
    const { tab } = screen({ lifeGridEnabled: true, lifeGridBirthDate: '1984-06-01' });
    const years = rows(tab.getSettingDefinitions()).find(
      (item) => 'control' in item && item.control?.key === 'lifeGridYears',
    );
    const format =
      years !== undefined && 'control' in years && years.control?.type === 'slider'
        ? years.control.displayFormat
        : undefined;
    expect(format?.(1)).toBe('1 year');
    expect(format?.(90)).toBe('90 years');
  });

  it('offers only images in the logo pickers', () => {
    const { tab } = screen();
    const pickers = rows(tab.getSettingDefinitions()).filter(
      (item) => 'control' in item && item.control?.type === 'file',
    );
    expect(pickers).toHaveLength(2);
    for (const picker of pickers) {
      if ('control' in picker && picker.control?.type === 'file') {
        expect(picker.control.placeholder).toBe(strings.logos.choose);
        expect(picker.control.filter).toBeTypeOf('function');
      }
    }
  });
});

describe('the rearrange button', () => {
  it('scatters the stars without touching a setting', () => {
    const { host, tab } = screen({ starfieldEnabled: true, starRegionTop: true });
    const row = rows(tab.getSettingDefinitions()).find(
      (item) => 'name' in item && item.name === strings.starfield.rearrange,
    );
    if (row === undefined || !('render' in row) || row.render === undefined) {
      throw new Error('the rearrange row declares no control of its own');
    }

    const setting = new Setting(document.body.createDiv());
    /* Obsidian passes the group the row sits in; nothing here reads it. */
    row.render(setting as unknown as ObsidianSetting, null as never);
    const button = setting.controlEl.querySelector('button');

    expect(button?.textContent).toBe(strings.starfield.rearrangeAction);
    button?.click();

    expect(document.querySelectorAll('.loopsk-starfield').length).toBeGreaterThan(0);
    expect(host.saved).toBe(0);
  });
});

describe('the birth date field', () => {
  function dateInput(over: Partial<SkywalkerSettings> = {}) {
    const { host, tab } = screen({
      lifeGridEnabled: true,
      lifeGridBirthDate: '1984-06-01',
      ...over,
    });
    const row = rows(tab.getSettingDefinitions()).find(
      (item) => 'name' in item && item.name === strings.lifegrid.birth,
    );
    if (row === undefined || !('render' in row) || row.render === undefined) {
      throw new Error('the birth date row declares no control of its own');
    }
    const setting = new Setting(document.body.createDiv());
    /* Obsidian passes the group the row sits in; nothing here reads it. */
    row.render(setting as unknown as ObsidianSetting, null as never);
    const input = setting.controlEl.querySelector('input');
    if (input === null) throw new Error('no date input was drawn');
    return { host, tab, input };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-09T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens on the date already stored', () => {
    const { input } = dateInput();
    expect(input.type).toBe('date');
    expect(input.value).toBe('1984-06-01');
  });

  it('refuses a birthday later than today', () => {
    expect(dateInput().input.max).toBe('2026-09-09');
  });

  it('stores a date the moment it is picked', async () => {
    const { host, input } = dateInput();
    input.value = '1990-01-01';
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(host.settings.lifeGridBirthDate).toBe('1990-01-01'));
  });

  it('redraws the screen when the first date turns the rest of the calendar on', async () => {
    const { tab, input } = dateInput({ lifeGridBirthDate: '' });
    input.value = '1990-01-01';
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(tab.updates).toBe(1));
  });

  it('leaves the screen alone when one date replaces another', async () => {
    const { host, tab, input } = dateInput();
    input.value = '1990-01-01';
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(host.saved).toBe(1));
    expect(tab.updates).toBe(0);
  });
});
