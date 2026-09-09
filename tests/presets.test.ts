/*
 * Skywalker Settings - Plugin for Obsidian
 * Copyright (c) 2026 theLOOP
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it } from 'vitest';
import {
  CUSTOM_PRESET,
  findPreset,
  matchesPreset,
  PRESET_IDS,
  PRESET_KEYS,
  presetOptions,
  PRESETS,
} from '../src/presets';
import { DEFAULT_SETTINGS } from '../src/settings';

describe('the preset table', () => {
  it('gives every preset a distinct id', () => {
    const ids = PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('names Custom something no preset can collide with', () => {
    expect(PRESETS.map((preset) => preset.id)).not.toContain(CUSTOM_PRESET);
  });

  it('offers every preset and Custom in the dropdown', () => {
    expect(Object.keys(presetOptions).sort()).toEqual([...PRESET_IDS].sort());
    for (const label of Object.values(presetOptions)) expect(label).not.toBe('');
  });

  it('sets every owned slider in every preset', () => {
    for (const preset of PRESETS) {
      for (const key of PRESET_KEYS) expect(preset.values[key]).toBeTypeOf('number');
    }
  });

  it('starts on a preset that exists', () => {
    expect(findPreset(DEFAULT_SETTINGS.starPreset)).toBeDefined();
  });

  it('ships defaults that match the preset they claim', () => {
    expect(matchesPreset(DEFAULT_SETTINGS, DEFAULT_SETTINGS.starPreset)).toBe(true);
  });
});

describe('findPreset', () => {
  it.each(PRESETS)('finds $id', (preset) => {
    expect(findPreset(preset.id)).toBe(preset);
  });

  it('finds nothing for Custom, which owns no values', () => {
    expect(findPreset(CUSTOM_PRESET)).toBeUndefined();
  });

  it('finds nothing for a preset that never existed', () => {
    expect(findPreset('supernova')).toBeUndefined();
  });
});

describe('matchesPreset', () => {
  it.each(PRESETS)('holds while nothing $id owns has moved', (preset) => {
    expect(matchesPreset({ ...DEFAULT_SETTINGS, ...preset.values }, preset.id)).toBe(true);
  });

  it.each(PRESET_KEYS)('breaks once %s has moved', (key) => {
    const preset = PRESETS[0];
    if (preset === undefined) throw new Error('no presets to test against');
    const settings = { ...DEFAULT_SETTINGS, ...preset.values };
    settings[key] = preset.values[key] + 5;
    expect(matchesPreset(settings, preset.id)).toBe(false);
  });

  it('ignores a slider no preset owns', () => {
    const preset = PRESETS[0];
    if (preset === undefined) throw new Error('no presets to test against');
    const settings = { ...DEFAULT_SETTINGS, ...preset.values, starHeight: 200, starDrift: 30 };
    expect(matchesPreset(settings, preset.id)).toBe(true);
  });

  it('never matches Custom, which is the absence of a claim', () => {
    expect(matchesPreset(DEFAULT_SETTINGS, CUSTOM_PRESET)).toBe(false);
  });

  it('never matches a preset the build no longer ships', () => {
    expect(matchesPreset(DEFAULT_SETTINGS, 'supernova')).toBe(false);
  });
});
