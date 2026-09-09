/*
 * Skywalker Settings - Plugin for Obsidian
 * Copyright (c) 2026 theLOOP
 * SPDX-License-Identifier: MIT
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PRESET_IDS } from '../src/presets';
import {
  DEFAULT_SETTINGS,
  LAYOUTS,
  normalise,
  RANGES,
  type SkywalkerSettings,
  TINTS,
} from '../src/settings';

const NUMERIC = Object.keys(RANGES) as (keyof typeof RANGES)[];

describe('normalise', () => {
  it('returns the defaults for a file that holds nothing', () => {
    expect(normalise({}, PRESET_IDS)).toEqual(DEFAULT_SETTINGS);
  });

  it.each([null, undefined, 42, 'settings', []])(
    'survives %p where an object was expected',
    (raw) => {
      expect(normalise(raw, PRESET_IDS)).toEqual(DEFAULT_SETTINGS);
    },
  );

  it('keeps every value a healthy file holds', () => {
    const stored: SkywalkerSettings = {
      ...DEFAULT_SETTINGS,
      starfieldEnabled: true,
      starPreset: 'embers',
      starCount: 320,
      starColor: '#abc',
      lifeGridBirthDate: '1984-06-01',
      lifeGridLayout: 'ribbon',
      lifeGridTintMode: 'custom',
      vaultLogoPath: 'art/mark.svg',
    };
    expect(normalise(stored, PRESET_IDS)).toEqual(stored);
  });

  describe('numbers', () => {
    it.each(NUMERIC)('clamps %s to its slider', (key) => {
      const { min, max } = RANGES[key];
      expect(normalise({ [key]: max + 1_000_000 }, PRESET_IDS)[key]).toBe(max);
      expect(normalise({ [key]: min - 1_000_000 }, PRESET_IDS)[key]).toBe(min);
    });

    it.each(NUMERIC)('falls back for %s when the value is not a number', (key) => {
      for (const junk of ['70', null, {}, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(normalise({ [key]: junk }, PRESET_IDS)[key]).toBe(DEFAULT_SETTINGS[key]);
      }
    });

    it('always lands inside the slider, whatever the file says', () => {
      fc.assert(
        fc.property(
          fc.dictionary(fc.constantFrom(...NUMERIC), fc.double({ noDefaultInfinity: false })),
          (raw) => {
            const settings = normalise(raw, PRESET_IDS);
            for (const key of NUMERIC) {
              expect(settings[key]).toBeGreaterThanOrEqual(RANGES[key].min);
              expect(settings[key]).toBeLessThanOrEqual(RANGES[key].max);
            }
          },
        ),
      );
    });
  });

  describe('choices', () => {
    it.each(LAYOUTS)('accepts the layout %s', (layout) => {
      expect(normalise({ lifeGridLayout: layout }, PRESET_IDS).lifeGridLayout).toBe(layout);
    });

    it.each(TINTS)('accepts the tint %s', (tint) => {
      expect(normalise({ lifeGridTintMode: tint }, PRESET_IDS).lifeGridTintMode).toBe(tint);
    });

    it.each(PRESET_IDS)('accepts the preset %s', (preset) => {
      expect(normalise({ starPreset: preset }, PRESET_IDS).starPreset).toBe(preset);
    });

    it('drops a layout renamed out of the plugin', () => {
      expect(normalise({ lifeGridLayout: 'spiral' }, PRESET_IDS).lifeGridLayout).toBe(
        DEFAULT_SETTINGS.lifeGridLayout,
      );
    });

    it('drops a preset the build no longer ships', () => {
      expect(normalise({ starPreset: 'supernova' }, PRESET_IDS).starPreset).toBe(
        DEFAULT_SETTINGS.starPreset,
      );
    });

    it('drops a tint that is not one of the three', () => {
      expect(normalise({ lifeGridTintMode: 'rainbow' }, PRESET_IDS).lifeGridTintMode).toBe(
        DEFAULT_SETTINGS.lifeGridTintMode,
      );
    });
  });

  describe('colours', () => {
    it.each(['#fff', '#FFF', '#ffe9b8', '#FFE9B8'])('accepts %s', (colour) => {
      expect(normalise({ starColor: colour }, PRESET_IDS).starColor).toBe(colour);
    });

    it.each(['ffffff', '#ffff', '#gggggg', 'white', '', 0xffffff])('rejects %p', (colour) => {
      expect(normalise({ starColor: colour }, PRESET_IDS).starColor).toBe(
        DEFAULT_SETTINGS.starColor,
      );
    });
  });

  describe('the birth date', () => {
    it('keeps a date written the way the input writes it', () => {
      expect(normalise({ lifeGridBirthDate: '1984-06-01' }, PRESET_IDS).lifeGridBirthDate).toBe(
        '1984-06-01',
      );
    });

    it('keeps the empty string, which is what "not set yet" looks like', () => {
      expect(normalise({ lifeGridBirthDate: '' }, PRESET_IDS).lifeGridBirthDate).toBe('');
    });

    it.each(['01/06/1984', '1984-6-1', 'yesterday', 19840601])('rejects %p', (date) => {
      expect(normalise({ lifeGridBirthDate: date }, PRESET_IDS).lifeGridBirthDate).toBe('');
    });
  });

  it('keeps a vault path as written, since only the vault can judge it', () => {
    const path = 'Attachments/логотип 2.svg';
    expect(normalise({ vaultLogoPath: path }, PRESET_IDS).vaultLogoPath).toBe(path);
  });

  it('ignores keys the plugin does not own', () => {
    const settings = normalise({ __proto__: { polluted: true }, extra: 1 }, PRESET_IDS);
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect('extra' in settings).toBe(false);
  });
});

describe('RANGES', () => {
  it('covers every numeric setting', () => {
    const numeric = Object.entries(DEFAULT_SETTINGS)
      .filter(([, value]) => typeof value === 'number')
      .map(([key]) => key);
    expect(new Set(NUMERIC)).toEqual(new Set(numeric));
  });

  it.each(NUMERIC)('holds a usable slider for %s', (key) => {
    const { min, max, step } = RANGES[key];
    expect(min).toBeLessThan(max);
    expect(step).toBeGreaterThan(0);
    expect(DEFAULT_SETTINGS[key]).toBeGreaterThanOrEqual(min);
    expect(DEFAULT_SETTINGS[key]).toBeLessThanOrEqual(max);
  });
});
