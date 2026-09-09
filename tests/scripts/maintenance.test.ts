/*
 * Skywalker Settings - Plugin for Obsidian
 * Copyright (c) 2026 theLOOP
 * SPDX-License-Identifier: MIT
 */

/// <reference types="node" />

import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/* The gates run as the workflow runs them: a real Node process against a real
   directory, so a script that only works from this repository is caught here. */

const repository = process.cwd();
const temporary: string[] = [];

const MANIFEST = {
  id: 'skywalker-settings',
  name: 'Skywalker Settings',
  version: '0.1.0',
  minAppVersion: '1.13.0',
  description: 'Companion for a theme. Adds a starfield and a life calendar.',
  author: 'theLOOP',
  authorUrl: 'https://github.com/theloop-am',
  isDesktopOnly: false,
};

async function write(root: string, name: string, contents: string): Promise<void> {
  const destination = path.join(root, name);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, contents);
}

async function json(root: string, name: string, value: unknown): Promise<void> {
  await write(root, name, JSON.stringify(value, null, 2));
}

async function fixture(script: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'skywalker-gates-'));
  temporary.push(root);
  await mkdir(path.join(root, 'scripts'));
  await copyFile(path.join(repository, 'scripts', script), path.join(root, 'scripts', script));
  return root;
}

function run(root: string, script: string, args: string[] = []) {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', script), ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout: 20_000,
  });
  if (result.error) throw result.error;
  return result;
}

afterEach(async () => {
  await Promise.all(temporary.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('the manifest gate', () => {
  async function manifestFixture(over: Record<string, unknown> = {}): Promise<string> {
    const root = await fixture('check-manifest.mjs');
    await json(root, 'manifest.json', { ...MANIFEST, ...over });
    await json(root, 'versions.json', { '0.1.0': '1.13.0' });
    await write(root, 'README.md', '# Skywalker Settings\n');
    await write(root, 'LICENSE', 'MIT\n');
    return root;
  }

  it('passes a manifest the directory would accept', async () => {
    const result = run(await manifestFixture(), 'check-manifest.mjs');
    expect(result.status).toBe(0);
  });

  it.each([
    ['a missing author', { author: '' }],
    ['a version that is not semver', { version: '0.1' }],
    ['an id with a capital in it', { id: 'Skywalker' }],
    ['an id naming the app', { id: 'obsidian-skywalker' }],
    ['an id ending in plugin', { id: 'skywalker-plugin' }],
    ['a name saying plugin', { name: 'Skywalker Plugin' }],
    ['a description naming the app', { description: 'Adds stars to Obsidian.' }],
    ['a description that opens with "This plugin"', { description: 'This plugin adds stars.' }],
    ['a description with no full stop', { description: 'Adds a starfield and a calendar' }],
    ['a description carrying emoji', { description: 'Adds a starfield ✨ and a calendar.' }],
    ['a desktop flag that is not a boolean', { isDesktopOnly: 'false' }],
    ['an authorUrl that is not a URL', { authorUrl: 'theloop-am' }],
  ])('refuses %s', async (_case, over) => {
    const result = run(await manifestFixture(over), 'check-manifest.mjs');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Manifest:');
  });

  it('refuses a README that is there but empty', async () => {
    const root = await manifestFixture();
    await write(root, 'README.md', '   \n');
    expect(run(root, 'check-manifest.mjs').status).toBe(1);
  });
});

describe('the release gate', () => {
  const CHANGELOG = '# Changelog\n\n## [0.1.0] - 2026-09-09\n\n### Added\n\n- The first release.\n';

  async function releaseFixture(over: {
    manifest?: Record<string, unknown>;
    pkg?: Record<string, unknown>;
    versions?: Record<string, string>;
    changelog?: string;
  } = {}): Promise<string> {
    const root = await fixture('check-release.mjs');
    await json(root, 'manifest.json', { ...MANIFEST, ...over.manifest });
    await json(root, 'package.json', { version: '0.1.0', ...over.pkg });
    await json(root, 'versions.json', over.versions ?? { '0.1.0': '1.13.0' });
    await write(root, 'CHANGELOG.md', over.changelog ?? CHANGELOG);
    return root;
  }

  it('passes when all four carry one number', async () => {
    expect(run(await releaseFixture(), 'check-release.mjs').status).toBe(0);
  });

  it('prints the version a release will carry', async () => {
    const result = run(await releaseFixture(), 'check-release.mjs', ['--version']);
    expect(result.stdout.trim()).toBe('version=0.1.0');
  });

  it('prints the notes a release will publish', async () => {
    const result = run(await releaseFixture(), 'check-release.mjs', ['--notes']);
    expect(result.stdout.trim()).toBe('### Added\n\n- The first release.');
  });

  it('refuses a package file left on the previous version', async () => {
    const result = run(await releaseFixture({ pkg: { version: '0.0.9' } }), 'check-release.mjs');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('0.0.9');
  });

  it('refuses a compatibility map with no entry for this version', async () => {
    const root = await releaseFixture({ versions: { '0.0.9': '1.13.0' } });
    expect(run(root, 'check-release.mjs').status).toBe(1);
  });

  it('refuses a compatibility map that disagrees about the app version', async () => {
    const root = await releaseFixture({ versions: { '0.1.0': '1.12.0' } });
    expect(run(root, 'check-release.mjs').status).toBe(1);
  });

  it('refuses a changelog with no section for this version', async () => {
    const root = await releaseFixture({ changelog: '# Changelog\n\n## Unreleased\n' });
    expect(run(root, 'check-release.mjs').status).toBe(1);
  });

  it('refuses a section that is a heading and nothing else', async () => {
    const root = await releaseFixture({
      changelog: '# Changelog\n\n## [0.1.0] - 2026-09-09\n\n## [0.0.9] - 2026-01-01\n\n- Old.\n',
    });
    expect(run(root, 'check-release.mjs').status).toBe(1);
  });

  it('refuses a section heading with no date on it', async () => {
    const root = await releaseFixture({ changelog: '# Changelog\n\n## [0.1.0]\n\n- Nothing.\n' });
    expect(run(root, 'check-release.mjs').status).toBe(1);
  });
});

describe('the stylesheet gate', () => {
  async function stylesFixture(source: string, sheet: string): Promise<string> {
    const root = await fixture('check-styles.mjs');
    await write(root, 'src/nested/view.ts', source);
    await write(root, 'styles.css', sheet);
    return root;
  }

  it('passes when the code and the stylesheet name the same classes', async () => {
    const root = await stylesFixture(
      "const cls = 'loopsk-starfield'; el.addClass('loopsk-lifegrid');",
      '.loopsk-starfield { opacity: 1; }\n.loopsk-lifegrid { display: grid; }\n',
    );
    expect(run(root, 'check-styles.mjs').status).toBe(0);
  });

  it('reports a class the code writes and nobody styles', async () => {
    const root = await stylesFixture(
      "el.addClass('loopsk-starfield'); el.addClass('loopsk-orphan');",
      '.loopsk-starfield { opacity: 1; }\n',
    );
    const result = run(root, 'check-styles.mjs');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('.loopsk-orphan');
  });

  it('reports a rule left behind by a class nobody writes', async () => {
    const root = await stylesFixture(
      "el.addClass('loopsk-starfield');",
      '.loopsk-starfield { opacity: 1; }\n.loopsk-forgotten { display: none; }\n',
    );
    const result = run(root, 'check-styles.mjs');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('.loopsk-forgotten');
  });

  it('tells a custom property apart from a class', async () => {
    const root = await stylesFixture(
      "el.style.setProperty('--loopsk-lifegrid-cell', '6px'); el.addClass('loopsk-lifegrid');",
      '.loopsk-lifegrid { width: var(--loopsk-lifegrid-cell); }\n',
    );
    expect(run(root, 'check-styles.mjs').status).toBe(0);
  });

  it('fails rather than passing when it read nothing at all', async () => {
    const root = await stylesFixture('const nothing = 1;', 'body { margin: 0; }\n');
    const result = run(root, 'check-styles.mjs');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('the check itself is broken');
  });
});

describe('the translation gate', () => {
  async function stringsFixture(english: string, source: string, russian = english): Promise<string> {
    const root = await fixture('check-strings.mjs');
    await mkdir(path.join(root, 'node_modules'));
    await symlink(
      path.join(repository, 'node_modules/typescript'),
      path.join(root, 'node_modules/typescript'),
    );
    await write(root, 'src/i18n/locales/en.ts', `export const en = ${english} as const;`);
    await write(root, 'src/i18n/locales/ru.ts', `export const ru = ${russian};`);
    await write(root, 'src/ui/nested/screen.ts', source);
    return root;
  }

  it('passes when every key is read and both locales agree', async () => {
    const root = await stringsFixture(
      "{ heading: 'Starfield', lifegrid: { caption: 'Caption' } }",
      'const rows = [strings.heading, strings.lifegrid.caption];',
    );
    expect(run(root, 'check-strings.mjs').status).toBe(0);
  });

  it('counts a key read through a string method', async () => {
    const root = await stringsFixture(
      "{ day: 'Flight day {day}' }",
      "const line = strings.day.replace('{day}', value);",
    );
    expect(run(root, 'check-strings.mjs').status).toBe(0);
  });

  it('counts every leaf a branch picked from at runtime', async () => {
    const root = await stringsFixture(
      "{ layouts: { ribbon: 'Ribbon', ageyear: 'A row per year' } }",
      'const label = strings.layouts[key];',
    );
    expect(run(root, 'check-strings.mjs').status).toBe(0);
  });

  it('reports a key English declares and nothing reads', async () => {
    const root = await stringsFixture(
      "{ heading: 'Starfield', unused: 'Nobody' }",
      'const rows = [strings.heading];',
    );
    const result = run(root, 'check-strings.mjs');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('unused');
  });

  it('reports a locale that has drifted from English', async () => {
    const root = await stringsFixture(
      "{ heading: 'Starfield' }",
      'const rows = [strings.heading];',
      "{ heading: 'Звёздное небо', extra: 'Лишнее' }",
    );
    const result = run(root, 'check-strings.mjs');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('extra');
  });

  it('reports a locale missing a key English carries', async () => {
    const root = await stringsFixture(
      "{ heading: 'Starfield', caption: 'Caption' }",
      'const rows = [strings.heading, strings.caption];',
      "{ heading: 'Звёздное небо' }",
    );
    const result = run(root, 'check-strings.mjs');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('caption');
  });

  it('reports a string the screen reads and English never declared', async () => {
    const root = await stringsFixture(
      "{ heading: 'Starfield' }",
      'const rows = [strings.heading, strings.invented];',
    );
    const result = run(root, 'check-strings.mjs');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('invented');
  });
});
