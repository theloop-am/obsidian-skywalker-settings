/*
 * Skywalker Settings - Plugin for Obsidian
 * Copyright (c) 2026 theLOOP
 * SPDX-License-Identifier: MIT
 */

import { strings } from '../i18n/index';
import type { LifeGridLayout, LifeGridTint } from '../settings';

/* Records rather than lists: a layout added to the union and forgotten here is a
   compile error, not a dropdown with a blank row in it. */

export const layoutOptions: Record<LifeGridLayout, string> = {
  ageyear: strings.lifegrid.layoutAgeyear,
  ribbon: strings.lifegrid.layoutRibbon,
};

export const tintOptions: Record<LifeGridTint, string> = {
  neutral: strings.lifegrid.tintNeutral,
  accent: strings.lifegrid.tintAccent,
  custom: strings.lifegrid.tintCustom,
};

export const percent = (value: number): string => `${value}%`;

export const pixels = (value: number): string => `${value}px`;
