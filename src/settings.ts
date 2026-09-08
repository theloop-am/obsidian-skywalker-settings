export interface SkywalkerSettings {
  /** Starfield across the top bar. */
  starfieldEnabled: boolean;
  starPreset: string;
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
  starPreset: 'headliner',
  starCount: 70,
  starHeight: 40,
  starScale: 110,
  starSpeed: 70,
  starBlinkShare: 30,
  starBrightness: 65,
  starColor: '#ffffff',
  starWarmColor: '#ffe9b8',
  starWarmShare: 35,

  vaultLogoPath: '',
  bannerLogoPath: '',
};
