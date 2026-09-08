import { SkywalkerSettings } from '../settings';

/**
 * A starfield of real elements.
 *
 * The theme ships a CSS-only version and it is limited in a way no amount of
 * cleverness gets around: one pseudo-element carries one opacity animation, so
 * every star drawn into it pulses in unison. Six pseudo-elements is six groups,
 * and that is the ceiling. Here each star is its own element, so the count is an
 * actual count and no two are in step.
 *
 * The look follows jo_Geek's Night Sky pen (MIT), which gets four things right
 * that are easy to miss:
 *
 *   - stars come in a few discrete sizes, not a continuous spread;
 *   - only the largest carry a glow, the rest are bare points;
 *   - small stars blink quickly, large ones slowly;
 *   - and most importantly, only some of them blink at all, and those that do
 *     go all the way to zero rather than merely dimming.
 *
 * A sky where everything pulses gently at once reads as decoration. A sky where
 * most points sit still and a few wink out entirely reads as a sky.
 */

const CONTAINER_CLASS = 'loop-starfield';
const ACTIVE_CLASS = 'loop-starfield-active';

/** Size in px, glow radius multiplier, and the period band it blinks in. */
const TIERS = [
  { size: 0.5, glow: 0, period: [1.0, 2.5], weight: 34 },
  { size: 1.0, glow: 0, period: [2.0, 4.0], weight: 30 },
  { size: 1.5, glow: 0, period: [3.0, 5.0], weight: 18 },
  { size: 2.0, glow: 2.5, period: [4.0, 7.0], weight: 10 },
  { size: 2.5, glow: 3.5, period: [5.0, 9.0], weight: 6 },
  { size: 3.5, glow: 5.0, period: [6.0, 11.0], weight: 2 },
];

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickTier() {
  const total = TIERS.reduce((n, t) => n + t.weight, 0);
  let roll = Math.random() * total;
  for (const tier of TIERS) {
    roll -= tier.weight;
    if (roll <= 0) return tier;
  }
  return TIERS[0];
}

export function renderStarfield(settings: SkywalkerSettings): void {
  removeStarfield();
  if (!settings.starfieldEnabled || settings.starCount < 1) return;

  // Marks that a real starfield is on screen, so the theme's CSS-only version
  // steps aside. Deliberately not tied to the plugin merely being installed:
  // with the plugin's stars switched off, the theme's should still show.
  document.body.addClass(ACTIVE_CLASS);

  const container = document.body.createDiv({ cls: CONTAINER_CLASS });
  container.setAttribute('aria-hidden', 'true');
  container.setCssProps({
    '--loop-starfield-height': `${settings.starHeight}px`,
    '--loop-star-brightness': `${settings.starBrightness / 100}`,
  });

  const scale = settings.starScale / 100;
  const speed = settings.starSpeed / 100;

  for (let i = 0; i < settings.starCount; i++) {
    const tier = pickTier();
    const blinks = Math.random() * 100 < settings.starBlinkShare;
    const warm = Math.random() * 100 < settings.starWarmShare;
    const size = tier.size * scale;

    const star = container.createDiv({
      cls: blinks ? 'loop-star loop-star-blink' : 'loop-star',
    });

    const props: Record<string, string> = {
      // Denser towards the top, the way a horizon thins out.
      '--x': `${rand(0, 100).toFixed(2)}%`,
      '--y': `${(Math.pow(Math.random(), 1.4) * 88 + 6).toFixed(2)}%`,
      '--size': `${size.toFixed(2)}px`,
      '--color': warm ? settings.starWarmColor : settings.starColor,
      '--glow': tier.glow ? `${(size * tier.glow).toFixed(2)}px` : '0px',
      // Fixed stars sit at a range of brightnesses so the still half of the sky
      // is not a flat wash of identical dots.
      '--rest': `${rand(0.35, 1).toFixed(2)}`,
    };

    if (blinks) {
      const period = rand(tier.period[0], tier.period[1]) / speed;
      props['--period'] = `${period.toFixed(2)}s`;
      // A negative delay drops each star mid-cycle, so the sky is already
      // scattered in phase on the first frame instead of flashing in unison
      // and only drifting apart later.
      props['--delay'] = `${(-rand(0, period)).toFixed(2)}s`;
    }

    star.setCssProps(props);
  }
}

export function removeStarfield(): void {
  document.body.findAll(`.${CONTAINER_CLASS}`).forEach((el) => el.detach());
  document.body.removeClass(ACTIVE_CLASS);
}
