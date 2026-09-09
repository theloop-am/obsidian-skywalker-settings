/*
 * Skywalker Settings - Plugin for Obsidian
 * Copyright (c) 2026 theLOOP
 * SPDX-License-Identifier: MIT
 */

import { strings } from './i18n/index';
import type { SkywalkerSettings } from './settings';

/** The values a preset fixes. Everything else stays as the user left it. */
export type PresetValues = Pick<
  SkywalkerSettings,
  'starCount' | 'starScale' | 'starBlinkShare' | 'starSpeed' | 'starBrightness' | 'starWarmShare'
>;

export interface Preset {
  readonly id: string;
  readonly name: string;
  readonly values: PresetValues;
}

/* A record, so a key added to PresetValues and forgotten here fails to compile. */
const OWNED: Record<keyof PresetValues, true> = {
  starCount: true,
  starScale: true,
  starBlinkShare: true,
  starSpeed: true,
  starBrightness: true,
  starWarmShare: true,
};

/** Sliders a preset owns. Moving one of these drops the preset to Custom. */
export const PRESET_KEYS = Object.keys(OWNED) as (keyof PresetValues)[];

export const PRESETS: Preset[] = [
  {
    id: 'headliner',
    name: strings.presets.headliner,
    values: {
      starCount: 70,
      starScale: 110,
      starBlinkShare: 45,
      starSpeed: 100,
      starBrightness: 65,
      starWarmShare: 35,
    },
  },
  {
    id: 'deep-sky',
    name: strings.presets.deepSky,
    values: {
      starCount: 320,
      starScale: 80,
      starBlinkShare: 35,
      starSpeed: 85,
      starBrightness: 55,
      starWarmShare: 15,
    },
  },
  {
    id: 'sparkle',
    name: strings.presets.sparkle,
    values: {
      starCount: 90,
      starScale: 130,
      starBlinkShare: 80,
      starSpeed: 180,
      starBrightness: 85,
      starWarmShare: 45,
    },
  },
  {
    id: 'embers',
    name: strings.presets.embers,
    values: {
      starCount: 45,
      starScale: 190,
      starBlinkShare: 55,
      starSpeed: 70,
      starBrightness: 75,
      starWarmShare: 90,
    },
  },
];

export const CUSTOM_PRESET = 'custom';

/** Every value the preset dropdown will accept, Custom included. */
export const PRESET_IDS: string[] = [...PRESETS.map((preset) => preset.id), CUSTOM_PRESET];

export const presetOptions: Record<string, string> = {
  ...Object.fromEntries(PRESETS.map((preset) => [preset.id, preset.name])),
  [CUSTOM_PRESET]: strings.presets.custom,
};

export function findPreset(id: string): Preset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}

/**
 * True when the settings still match the preset they claim to be. Moving any
 * slider a preset owns makes this false, which is the signal to flip the
 * dropdown over to Custom rather than leaving it lying about what is on screen.
 */
export function matchesPreset(settings: SkywalkerSettings, id: string): boolean {
  const preset = findPreset(id);
  if (preset === undefined) return false;
  return PRESET_KEYS.every((key) => settings[key] === preset.values[key]);
}
