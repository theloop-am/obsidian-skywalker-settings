export interface SkywalkerSettings {
  /** Starfield across the top bar. */
  starfieldEnabled: boolean;
  starPreset: string;
  starRegionTop: boolean;
  starRegionLeft: boolean;
  starRegionRight: boolean;
  starEdgeBrightness: number;
  starDrift: number;
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
  starRegionTop: true,
  starRegionLeft: false,
  starRegionRight: false,
  starEdgeBrightness: 45,
  starDrift: 0,
  starCount: 70,
  starHeight: 40,
  starScale: 110,
  starSpeed: 100,
  starBlinkShare: 45,
  starBrightness: 65,
  starColor: '#ffffff',
  starWarmColor: '#ffe9b8',
  starWarmShare: 35,

  vaultLogoPath: '',
  bannerLogoPath: '',
};
