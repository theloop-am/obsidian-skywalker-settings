/*
 * Skywalker Settings - Plugin for Obsidian
 * Copyright (c) 2026 theLOOP
 * SPDX-License-Identifier: MIT
 */

export type LifeGridLayout = 'ribbon' | 'ageyear';

export type LifeGridTint = 'neutral' | 'accent' | 'custom';

export interface SkywalkerSettings {
  /** Starfield across the top bar. */
  starfieldEnabled: boolean;
  starPreset: string;
  starRegionTop: boolean;
  starRegionLeft: boolean;
  starRegionRight: boolean;
  starRegionEmptyTab: boolean;
  starRegionGraph: boolean;
  starEdgeBrightness: number;
  starDrift: number;
  starCount: number;
  starMax: number;
  starHeight: number;
  starScale: number;
  starSpeed: number;
  starBlinkShare: number;
  starBrightness: number;
  starColor: string;
  starWarmColor: string;
  starWarmShare: number;

  lifeGridEnabled: boolean;
  lifeGridBirthDate: string;
  lifeGridYears: number;
  lifeGridLayout: LifeGridLayout;
  lifeGridCellSize: number;
  lifeGridWidth: number;
  lifeGridStrength: number;
  lifeGridTextStrength: number;
  lifeGridCaption: boolean;
  lifeGridBareTab: boolean;
  lifeGridTintMode: LifeGridTint;
  lifeGridTint: string;

  /** Vault images handed to the theme as CSS variables. */
  vaultLogoPath: string;
  bannerLogoPath: string;
}

export const DEFAULT_SETTINGS: SkywalkerSettings = {
  starfieldEnabled: false,
  starPreset: 'headliner',
  starRegionTop: true,
  starRegionLeft: false,
  starRegionRight: false,
  starRegionEmptyTab: false,
  starRegionGraph: false,
  starEdgeBrightness: 45,
  starDrift: 0,
  starCount: 70,
  starMax: 1500,
  starHeight: 40,
  starScale: 110,
  starSpeed: 100,
  starBlinkShare: 45,
  starBrightness: 65,
  starColor: '#ffffff',
  starWarmColor: '#ffe9b8',
  starWarmShare: 35,

  lifeGridEnabled: false,
  lifeGridBirthDate: '',
  lifeGridYears: 90,
  lifeGridLayout: 'ageyear',
  lifeGridCellSize: 6,
  lifeGridWidth: 55,
  lifeGridStrength: 65,
  lifeGridTextStrength: 70,
  lifeGridCaption: true,
  lifeGridBareTab: false,
  lifeGridTintMode: 'neutral',
  lifeGridTint: '#7d8aa3',

  vaultLogoPath: '',
  bannerLogoPath: '',
};

export const LAYOUTS: LifeGridLayout[] = ['ageyear', 'ribbon'];

export const TINTS: LifeGridTint[] = ['neutral', 'accent', 'custom'];

export interface Range {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

type NumericKey = {
  [K in keyof SkywalkerSettings]: SkywalkerSettings[K] extends number ? K : never;
}[keyof SkywalkerSettings];

/**
 * The bounds of every slider. The settings screen and `normalise` both read
 * these, so a slider's extent and a stored value cannot disagree. The type makes
 * a numeric setting missing from here a compile error.
 */
export const RANGES = {
  starEdgeBrightness: { min: 5, max: 100, step: 5 },
  starDrift: { min: 0, max: 30, step: 1 },
  starHeight: { min: 24, max: 200, step: 2 },
  starMax: { min: 100, max: 4000, step: 100 },
  starCount: { min: 10, max: 600, step: 10 },
  starScale: { min: 40, max: 300, step: 10 },
  starBrightness: { min: 10, max: 100, step: 5 },
  starBlinkShare: { min: 0, max: 100, step: 5 },
  starSpeed: { min: 25, max: 300, step: 5 },
  starWarmShare: { min: 0, max: 100, step: 5 },
  lifeGridYears: { min: 40, max: 120, step: 5 },
  lifeGridCellSize: { min: 3, max: 16, step: 1 },
  lifeGridWidth: { min: 25, max: 100, step: 5 },
  lifeGridStrength: { min: 10, max: 100, step: 5 },
  lifeGridTextStrength: { min: 10, max: 100, step: 5 },
} as const satisfies Record<NumericKey, Range>;

/** Three or six hexadecimal digits, which is what a colour input produces. */
const COLOUR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function number(value: unknown, key: NumericKey): number {
  const range = RANGES[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_SETTINGS[key];
  return Math.min(Math.max(value, range.min), range.max);
}

function boolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function colour(value: unknown, fallback: string): string {
  return typeof value === 'string' && COLOUR.test(value) ? value : fallback;
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function member<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return typeof value === 'string' && (allowed as string[]).includes(value)
    ? (value as T)
    : fallback;
}

/**
 * `data.json` holds whatever it holds: a hand-edited count, a layout renamed
 * between versions, an empty colour. All of it reaches the drawing code, so it
 * is read as unknown and each value earns its type here.
 */
export function normalise(raw: unknown, presets: string[]): SkywalkerSettings {
  const stored = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const date = text(stored.lifeGridBirthDate, DEFAULT_SETTINGS.lifeGridBirthDate);

  return {
    starfieldEnabled: boolean(stored.starfieldEnabled, DEFAULT_SETTINGS.starfieldEnabled),
    starPreset: member(stored.starPreset, presets, DEFAULT_SETTINGS.starPreset),
    starRegionTop: boolean(stored.starRegionTop, DEFAULT_SETTINGS.starRegionTop),
    starRegionLeft: boolean(stored.starRegionLeft, DEFAULT_SETTINGS.starRegionLeft),
    starRegionRight: boolean(stored.starRegionRight, DEFAULT_SETTINGS.starRegionRight),
    starRegionEmptyTab: boolean(stored.starRegionEmptyTab, DEFAULT_SETTINGS.starRegionEmptyTab),
    starRegionGraph: boolean(stored.starRegionGraph, DEFAULT_SETTINGS.starRegionGraph),
    starEdgeBrightness: number(stored.starEdgeBrightness, 'starEdgeBrightness'),
    starDrift: number(stored.starDrift, 'starDrift'),
    starCount: number(stored.starCount, 'starCount'),
    starMax: number(stored.starMax, 'starMax'),
    starHeight: number(stored.starHeight, 'starHeight'),
    starScale: number(stored.starScale, 'starScale'),
    starSpeed: number(stored.starSpeed, 'starSpeed'),
    starBlinkShare: number(stored.starBlinkShare, 'starBlinkShare'),
    starBrightness: number(stored.starBrightness, 'starBrightness'),
    starColor: colour(stored.starColor, DEFAULT_SETTINGS.starColor),
    starWarmColor: colour(stored.starWarmColor, DEFAULT_SETTINGS.starWarmColor),
    starWarmShare: number(stored.starWarmShare, 'starWarmShare'),

    lifeGridEnabled: boolean(stored.lifeGridEnabled, DEFAULT_SETTINGS.lifeGridEnabled),
    /* Shape only; the calendar decides whether the date is usable. */
    lifeGridBirthDate: DATE.test(date) ? date : DEFAULT_SETTINGS.lifeGridBirthDate,
    lifeGridYears: number(stored.lifeGridYears, 'lifeGridYears'),
    lifeGridLayout: member(stored.lifeGridLayout, LAYOUTS, DEFAULT_SETTINGS.lifeGridLayout),
    lifeGridCellSize: number(stored.lifeGridCellSize, 'lifeGridCellSize'),
    lifeGridWidth: number(stored.lifeGridWidth, 'lifeGridWidth'),
    lifeGridStrength: number(stored.lifeGridStrength, 'lifeGridStrength'),
    lifeGridTextStrength: number(stored.lifeGridTextStrength, 'lifeGridTextStrength'),
    lifeGridCaption: boolean(stored.lifeGridCaption, DEFAULT_SETTINGS.lifeGridCaption),
    lifeGridBareTab: boolean(stored.lifeGridBareTab, DEFAULT_SETTINGS.lifeGridBareTab),
    lifeGridTintMode: member(stored.lifeGridTintMode, TINTS, DEFAULT_SETTINGS.lifeGridTintMode),
    lifeGridTint: colour(stored.lifeGridTint, DEFAULT_SETTINGS.lifeGridTint),

    vaultLogoPath: text(stored.vaultLogoPath, DEFAULT_SETTINGS.vaultLogoPath),
    bannerLogoPath: text(stored.bannerLogoPath, DEFAULT_SETTINGS.bannerLogoPath),
  };
}
