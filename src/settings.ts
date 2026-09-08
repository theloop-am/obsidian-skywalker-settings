export interface SkywalkerSettings {
  /** Starfield across the top bar. */
  starfieldEnabled: boolean;
  starCount: number;
  starHeight: number;
  starScale: number;
  starSpeed: number;
  starBlinkShare: number;
  starBrightness: number;
  starColor: string;
  starWarmColor: string;
  starWarmShare: number;

  /** Vault images handed to the theme as CSS variables. */
  vaultLogoPath: string;
  bannerLogoPath: string;
}

export const DEFAULT_SETTINGS: SkywalkerSettings = {
  starfieldEnabled: false,
  starCount: 120,
  starHeight: 40,
  starScale: 100,
  starSpeed: 100,
  starBlinkShare: 45,
  starBrightness: 70,
  starColor: '#ffffff',
  starWarmColor: '#ffe9b8',
  starWarmShare: 25,

  vaultLogoPath: '',
  bannerLogoPath: '',
};
