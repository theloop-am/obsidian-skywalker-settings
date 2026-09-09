/*
 * Skywalker Settings - Plugin for Obsidian
 * Copyright (c) 2026 theLOOP
 * SPDX-License-Identifier: MIT
 */

import { getLanguage } from 'obsidian';

import type { Plural } from './forms.ts';

/* Built once. Reading the language is cheap; constructing the rules is not. */
let rules: Intl.PluralRules | null = null;
let locale: string | null = null;

function language(): string {
  locale ??= getLanguage() || 'en';
  return locale;
}

/**
 * Grouped in the language the interface is in, not the one the machine is in.
 * Plain `toLocaleString()` reads the operating system, which is how an English
 * screen ends up saying `14 276` next to an English word.
 */
export function decimal(value: number): string {
  return value.toLocaleString(language());
}

/** `2` and `недели`, not `2` and `недель`. */
export function count(value: number, plural: Plural): string {
  rules ??= new Intl.PluralRules(language());
  const category = rules.select(value);
  return `${decimal(value)} ${plural[category] ?? plural.other}`;
}
