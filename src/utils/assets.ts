import { App, TFile } from 'obsidian';
import { SkywalkerSettings } from '../settings';

/**
 * Hands vault images to the theme as CSS variables.
 *
 * This is the whole reason the theme cannot do it alone: a vault file is served
 * from app://<per-install hash>/<absolute path>, the hash is not knowable ahead
 * of time, and CSS has no way to read a path out of a setting and turn it into a
 * url(). getResourcePath does exactly that, and one setCssProps call later the
 * theme can mask, tint and animate the result like any other image.
 */

const VARS = {
  vaultLogo: '--loop-vault-logo',
  bannerLogo: '--loop-banner-logo',
} as const;

function resolve(app: App, path: string): string | null {
  if (!path) return null;
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) return null;
  try {
    return app.vault.getResourcePath(file);
  } catch {
    return null;
  }
}

export function applyAssets(app: App, settings: SkywalkerSettings): void {
  const props: Record<string, string> = {};

  const vaultLogo = resolve(app, settings.vaultLogoPath);
  const bannerLogo = resolve(app, settings.bannerLogoPath);

  if (vaultLogo) props[VARS.vaultLogo] = `url("${vaultLogo}")`;
  if (bannerLogo) props[VARS.bannerLogo] = `url("${bannerLogo}")`;

  clearAssets();
  if (Object.keys(props).length) document.body.setCssProps(props);

  // The theme keys its own fallback art off these, so it can step aside when a
  // real file is present rather than drawing over it.
  document.body.classList.toggle('loop-has-vault-logo', !!vaultLogo);
  document.body.classList.toggle('loop-has-banner-logo', !!bannerLogo);
}

export function clearAssets(): void {
  for (const name of Object.values(VARS)) {
    document.body.style.removeProperty(name);
  }
  document.body.removeClass('loop-has-vault-logo', 'loop-has-banner-logo');
}

/** Extensions the file pickers will offer. */
export const IMAGE_EXTENSIONS = ['svg', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'];
