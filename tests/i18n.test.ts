/*
 * Skywalker Settings - Plugin for Obsidian
 * Copyright (c) 2026 theLOOP
 * SPDX-License-Identifier: MIT
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { forms } from '../src/i18n/forms';
import { strings } from '../src/i18n/index';
import { STRINGS_EN } from '../src/i18n/locales/en';
import { STRINGS_RU } from '../src/i18n/locales/ru';
import { count } from '../src/i18n/plural';

/** Every leaf of a locale, as `a.b`. */
function leaves(node: unknown, prefix = ''): Map<string, unknown> {
  const found = new Map<string, unknown>();
  if (typeof node !== 'object' || node === null) return found;
  for (const [key, value] of Object.entries(node)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (typeof value === 'object' && value !== null && !('other' in value)) {
      for (const [inner, leaf] of leaves(value, path)) found.set(inner, leaf);
    } else {
      found.set(path, value);
    }
  }
  return found;
}

const english = leaves(STRINGS_EN);
const russian = leaves(STRINGS_RU);

describe('the dictionaries', () => {
  it('reads English when Obsidian is in English', () => {
    expect(strings).toBe(STRINGS_EN);
  });

  it('carry the same keys', () => {
    expect([...russian.keys()].sort()).toEqual([...english.keys()].sort());
  });

  it('translates every entry English declares', () => {
    for (const [key, source] of english) {
      const translated = russian.get(key);
      if (typeof source === 'string') {
        expect(translated, key).toBeTypeOf('string');
        expect(translated, key).not.toBe('');
      } else {
        expect(translated, key).toHaveProperty('other');
      }
    }
  });

  it('keeps every placeholder the English text carries', () => {
    for (const [key, source] of english) {
      if (typeof source !== 'string') continue;
      const wanted = source.match(/\{\w+\}/g) ?? [];
      const translated = russian.get(key);
      for (const placeholder of wanted) expect(translated).toContain(placeholder);
    }
  });

  it('leaves no placeholder unfilled in the caption', () => {
    const filled = STRINGS_EN.lifegrid.progress
      .replace('{lived}', '1')
      .replace('{total}', '2')
      .replace('{share}', '3');
    expect(filled).not.toMatch(/\{\w+\}/);
  });
});

describe('count', () => {
  it.each([
    [1, 'week'],
    [2, 'weeks'],
    [0, 'weeks'],
    [4695, 'weeks'],
  ])('says %i %s in English', (value, word) => {
    expect(count(value, STRINGS_EN.lifegrid.weekCount)).toBe(
      `${value.toLocaleString('en')} ${word}`,
    );
  });

  it('groups a number the way the interface language does, not the machine', () => {
    expect(count(4695, STRINGS_EN.lifegrid.weekCount)).toBe('4,695 weeks');
  });

  it.each([1, 2, 5, 11, 21, 4695])('uses the genitive after «из» for %i in Russian', (value) => {
    expect(count(value, STRINGS_RU.lifegrid.weekCount)).toContain('недель');
  });

  it('falls back to `other` for a form the locale does not carry', () => {
    expect(count(1, forms({ other: 'единиц' }))).toBe('1 единиц');
  });
});

describe('the language Obsidian is in', () => {
  async function underLanguage(language: string) {
    vi.resetModules();
    vi.doMock('obsidian', async () => ({
      ...(await vi.importActual<typeof import('./stubs/obsidian')>('./stubs/obsidian')),
      getLanguage: () => language,
    }));
    /* Reset gives this graph its own copy of the locales, so identity is only
       meaningful against the ones it loaded. */
    const [i18n, plural, en] = await Promise.all([
      import('../src/i18n/index'),
      import('../src/i18n/plural'),
      import('../src/i18n/locales/en'),
    ]);
    return { strings: i18n.strings, count: plural.count, english: en.STRINGS_EN };
  }

  afterEach(() => {
    vi.doUnmock('obsidian');
    vi.resetModules();
  });

  it('reads Russian when Obsidian is in Russian', async () => {
    const ru = await underLanguage('ru');
    expect(ru.strings.starfield.heading).toBe(STRINGS_RU.starfield.heading);
  });

  it('picks Russian plural forms for a Russian screen', async () => {
    const ru = await underLanguage('ru');
    expect(ru.count(2, forms({ one: 'год', few: 'года', many: 'лет', other: 'года' }))).toBe(
      '2 года',
    );
    expect(ru.count(5, forms({ one: 'год', few: 'года', many: 'лет', other: 'года' }))).toBe(
      '5 лет',
    );
  });

  it('reads English for a language the plugin does not ship', async () => {
    const nl = await underLanguage('nl');
    expect(nl.strings).toBe(nl.english);
  });

  it('reads English when Obsidian reports no language at all', async () => {
    const none = await underLanguage('');
    expect(none.strings).toBe(none.english);
    expect(none.count(1, STRINGS_EN.lifegrid.weekCount)).toBe('1 week');
  });
});
