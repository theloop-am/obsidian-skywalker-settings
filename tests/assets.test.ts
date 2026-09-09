/*
 * Skywalker Settings - Plugin for Obsidian
 * Copyright (c) 2026 theLOOP
 * SPDX-License-Identifier: MIT
 */

import type { App as ObsidianApp, TFile as ObsidianTFile } from 'obsidian';
import { afterEach, describe, expect, it } from 'vitest';
import { App, TFile, TFolder } from './stubs/obsidian';
import { applyAssets, clearAssets, IMAGE_EXTENSIONS, isImage } from '../src/assets';
import { DEFAULT_SETTINGS } from '../src/settings';

const VAULT_VAR = '--loopsk-vault-logo';
const BANNER_VAR = '--loopsk-banner-logo';

function vault(): { app: ObsidianApp; stub: App } {
  const stub = new App();
  return { app: stub as unknown as ObsidianApp, stub };
}

function property(name: string): string {
  return document.body.style.getPropertyValue(name);
}

afterEach(() => {
  clearAssets();
});

describe('applyAssets', () => {
  it('hands a chosen image to the theme as a url()', () => {
    const { app, stub } = vault();
    stub.vault.add(new TFile('art/mark.svg'));

    applyAssets(app, { ...DEFAULT_SETTINGS, vaultLogoPath: 'art/mark.svg' });

    expect(property(VAULT_VAR)).toBe('url("app://abcdef/art/mark.svg")');
    expect(property(BANNER_VAR)).toBe('');
  });

  it('sets both variables independently', () => {
    const { app, stub } = vault();
    stub.vault.add(new TFile('art/mark.svg'));
    stub.vault.add(new TFile('art/banner.png'));

    applyAssets(app, {
      ...DEFAULT_SETTINGS,
      vaultLogoPath: 'art/mark.svg',
      bannerLogoPath: 'art/banner.png',
    });

    expect(property(VAULT_VAR)).toContain('art/mark.svg');
    expect(property(BANNER_VAR)).toContain('art/banner.png');
  });

  it('sets nothing when no image is chosen', () => {
    const { app } = vault();
    applyAssets(app, DEFAULT_SETTINGS);
    expect(property(VAULT_VAR)).toBe('');
    expect(property(BANNER_VAR)).toBe('');
  });

  it('sets nothing when the setting points at a file the vault has lost', () => {
    const { app } = vault();
    applyAssets(app, { ...DEFAULT_SETTINGS, vaultLogoPath: 'art/gone.svg' });
    expect(property(VAULT_VAR)).toBe('');
  });

  it('sets nothing when the path is a folder', () => {
    const { app, stub } = vault();
    stub.vault.add(new TFolder('art'));
    applyAssets(app, { ...DEFAULT_SETTINGS, vaultLogoPath: 'art' });
    expect(property(VAULT_VAR)).toBe('');
  });

  it('sets nothing when the vault refuses to serve the file', () => {
    const { app, stub } = vault();
    stub.vault.add(new TFile('art/mark.svg'));
    stub.vault.unreadable.add('art/mark.svg');

    applyAssets(app, { ...DEFAULT_SETTINGS, vaultLogoPath: 'art/mark.svg' });

    expect(property(VAULT_VAR)).toBe('');
  });

  it('takes the variable away when the image is cleared', () => {
    const { app, stub } = vault();
    stub.vault.add(new TFile('art/mark.svg'));

    applyAssets(app, { ...DEFAULT_SETTINGS, vaultLogoPath: 'art/mark.svg' });
    applyAssets(app, DEFAULT_SETTINGS);

    expect(property(VAULT_VAR)).toBe('');
  });

  it('takes the variable away when the file it pointed at is deleted', () => {
    const { app, stub } = vault();
    const file = stub.vault.add(new TFile('art/mark.svg'));
    const settings = { ...DEFAULT_SETTINGS, vaultLogoPath: 'art/mark.svg' };

    applyAssets(app, settings);
    stub.vault.files.delete(file.path);
    applyAssets(app, settings);

    expect(property(VAULT_VAR)).toBe('');
  });
});

describe('clearAssets', () => {
  it('removes both variables', () => {
    const { app, stub } = vault();
    stub.vault.add(new TFile('art/mark.svg'));
    stub.vault.add(new TFile('art/banner.png'));
    applyAssets(app, {
      ...DEFAULT_SETTINGS,
      vaultLogoPath: 'art/mark.svg',
      bannerLogoPath: 'art/banner.png',
    });

    clearAssets();

    expect(property(VAULT_VAR)).toBe('');
    expect(property(BANNER_VAR)).toBe('');
  });

  it('is safe when nothing was ever set', () => {
    expect(() => clearAssets()).not.toThrow();
  });
});

describe('isImage', () => {
  it.each(IMAGE_EXTENSIONS)('offers a .%s file', (extension) => {
    expect(isImage(new TFile(`art/mark.${extension}`) as unknown as ObsidianTFile)).toBe(true);
  });

  it('offers a file whose extension is shouted', () => {
    expect(isImage(new TFile('art/MARK.SVG') as unknown as ObsidianTFile)).toBe(true);
  });

  it.each(['note.md', 'data.json', 'no-extension'])('does not offer %s', (path) => {
    expect(isImage(new TFile(path) as unknown as ObsidianTFile)).toBe(false);
  });
});
