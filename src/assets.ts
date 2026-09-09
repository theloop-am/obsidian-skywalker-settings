/*
 * Skywalker Settings - Plugin for Obsidian
 * Copyright (c) 2026 theLOOP
 * SPDX-License-Identifier: MIT
 */

import { type App, TFile } from 'obsidian';
import type { SkywalkerSettings } from './settings';

/**
 * Hands vault images to the theme as CSS variables.
 *
 * This is the whole reason the theme cannot do it alone: a vault file is served
 * from app://<per-install hash>/<absolute path>, the hash is not knowable ahead
 * of time, and CSS has no way to read a path out of a setting and turn it into a
 * url(). getResourcePath does exactly that, and one setCssProps call later the
 * theme can mask, tint and animate the result like any other image.
 */

/* The contract with the theme, which reads each as
   `var(--loopsk-vault-logo, url(its own mark))`. */
const VARS = {
  vaultLogo: '--loopsk-vault-logo',
  bannerLogo: '--loopsk-banner-logo',
} as const;

function resolve(app: App, path: string): string | null {
  if (path === '') return null;
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) return null;
  try {
    return app.vault.getResourcePath(file);
  } catch {
    return null;
  }
}

export function applyAssets(app: App, settings: SkywalkerSettings): void {
  const found = {
    vaultLogo: resolve(app, settings.vaultLogoPath),
    bannerLogo: resolve(app, settings.bannerLogoPath),
  };

  /* A setting pointed at a file that is gone must take its variable with it. */
  clearAssets();

  const props: Record<string, string> = {};
  for (const slot of ['vaultLogo', 'bannerLogo'] as const) {
    const url = found[slot];
    if (url !== null) props[VARS[slot]] = `url("${url}")`;
  }

  if (Object.keys(props).length > 0) document.body.setCssProps(props);
}

export function clearAssets(): void {
  for (const name of Object.values(VARS)) document.body.style.removeProperty(name);
}

/** Extensions the file pickers will offer. */
export const IMAGE_EXTENSIONS = ['svg', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'];

export function isImage(file: TFile): boolean {
  return IMAGE_EXTENSIONS.includes(file.extension.toLowerCase());
}
