import { SkywalkerSettings } from './settings';

/** The values a preset fixes. Everything else stays as the user left it. */
export type PresetValues = Pick<
  SkywalkerSettings,
  'starCount' | 'starScale' | 'starBlinkShare' | 'starSpeed' | 'starBrightness' | 'starWarmShare'
>;

export interface Preset {
  id: string;
  name: string;
  desc: string;
  values: PresetValues;
}

export const PRESETS: Preset[] = [
  {
    id: 'headliner',
    name: 'Headliner',
    desc: 'Sparse and calm, like the roof of a car.',
    values: {
      starCount: 70,
      starScale: 110,
      starBlinkShare: 30,
      starSpeed: 70,
      starBrightness: 65,
      starWarmShare: 35,
    },
  },
  {
    id: 'deep-sky',
    name: 'Deep sky',
    desc: 'Dense and almost still, the way a clear night actually looks.',
    values: {
      starCount: 320,
      starScale: 80,
      starBlinkShare: 15,
      starSpeed: 60,
      starBrightness: 55,
      starWarmShare: 15,
    },
  },
  {
    id: 'sparkle',
    name: 'Sparkle',
    desc: 'Fewer stars, most of them blinking, quickly.',
    values: {
      starCount: 90,
      starScale: 130,
      starBlinkShare: 80,
      starSpeed: 180,
      starBrightness: 85,
      starWarmShare: 45,
    },
  },
  {
    id: 'embers',
    name: 'Embers',
    desc: 'Large, slow and warm.',
    values: {
      starCount: 45,
      starScale: 190,
      starBlinkShare: 55,
      starSpeed: 45,
      starBrightness: 75,
      starWarmShare: 90,
    },
  },
];

export const CUSTOM_PRESET = 'custom';

export const presetOptions: Record<string, string> = {
  ...Object.fromEntries(PRESETS.map((p) => [p.id, p.name])),
  [CUSTOM_PRESET]: 'Custom',
};

export function findPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

/**
 * True when the settings still match the preset they claim to be. Moving any
 * slider a preset owns makes this false, which is the signal to flip the
 * dropdown over to Custom rather than leaving it lying about what is on screen.
 */
export function matchesPreset(settings: SkywalkerSettings, id: string): boolean {
  const preset = findPreset(id);
  if (!preset) return false;
  return (Object.keys(preset.values) as (keyof PresetValues)[]).every(
    (key) => settings[key] === preset.values[key]
  );
}
