import { SkywalkerSettings } from '../settings';

/**
 * A starfield of real elements.
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
/** Sidebars are far larger than the top strip, so they take a fraction of its
 *  density. Without this a pane would carry twenty times the strip's stars. */
const EDGE_DENSITY = 0.22;
const ACTIVE_CLASS = 'loop-starfield-active';

/** Size in px, glow radius multiplier, and the period band it blinks in. */
const TIERS = [
  { size: 0.5, glow: 0, period: [1.2, 2.4], weight: 34 },
  { size: 1.0, glow: 0, period: [1.6, 3.0], weight: 30 },
  { size: 1.5, glow: 0, period: [2.0, 3.6], weight: 18 },
  { size: 2.0, glow: 2.5, period: [2.6, 4.5], weight: 10 },
  { size: 2.5, glow: 3.5, period: [3.0, 5.5], weight: 6 },
  { size: 3.5, glow: 5.0, period: [3.5, 6.5], weight: 2 },
];

interface Region {
  /** Element the field is attached to, so it follows the pane as it resizes. */
  selector: string;
  enabled: (s: SkywalkerSettings) => boolean;
  /** The top strip is a fixed band; the panes fill their host. */
  fixedBand?: boolean;
  /** Full strength at the top, dimmed at the edges so they stay out of the way. */
  edge?: boolean;
  /** There can be several empty tabs open at once. */
  all?: boolean;
}

const REGIONS: Region[] = [
  { selector: 'body', enabled: (s) => s.starRegionTop, fixedBand: true },
  { selector: '.workspace-split.mod-left-split', enabled: (s) => s.starRegionLeft, edge: true },
  { selector: '.workspace-split.mod-right-split', enabled: (s) => s.starRegionRight, edge: true },
  {
    // Obsidian's own empty pane: no note, just Create new note / Go to file. It
    // is already transparent and position: relative, so the field goes inside it
    // and nothing about the app's own painting is touched.
    selector: '.workspace-leaf-content[data-type="empty"] .view-content',
    enabled: (s) => s.starRegionEmptyTab,
    all: true,
    // Counted as an edge like the sidebars. Left out of that it came through at
    // full strength and read as a different sky in the middle of the window.
    edge: true,
  },
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

function fill(container: HTMLElement, count: number, settings: SkywalkerSettings): void {
  const scale = settings.starScale / 100;
  const speed = settings.starSpeed / 100;

  for (let i = 0; i < count; i++) {
    const tier = pickTier();
    const blinks = Math.random() * 100 < settings.starBlinkShare;
    const warm = Math.random() * 100 < settings.starWarmShare;
    const size = tier.size * scale;

    const classes = ['loop-star'];
    if (blinks) classes.push('loop-star-blink');
    if (settings.starDrift > 0) classes.push('loop-star-drift');
    const star = container.createDiv({ cls: classes.join(' ') });

    const props: Record<string, string> = {
      '--x': `${rand(0, 100).toFixed(2)}%`,
      // Thinner towards the bottom, the way a sky does above a horizon.
      '--y': `${(Math.pow(Math.random(), 1.4) * 88 + 6).toFixed(2)}%`,
      '--size': `${size.toFixed(2)}px`,
      '--color': warm ? settings.starWarmColor : settings.starColor,
      '--glow': tier.glow ? `${(size * tier.glow).toFixed(2)}px` : '0px',
      // The fixed half of the sky sits at a range of brightnesses, so it is not
      // a flat wash of identical dots.
      '--rest': `${rand(0.35, 1).toFixed(2)}`,
    };

    // Parallax. Real stars do not move relative to one another on any timescale
    // you would notice; what sells depth is the viewer moving, with nearer
    // things sliding further than distant ones. So drift is tied to size, which
    // is the only depth cue here: the big foreground stars wander, the small
    // ones very nearly hold still. It alternates rather than looping, because a
    // loop has to snap back and the snap is what gives away a ticker tape.
    if (settings.starDrift > 0) {
      const depth = size / (TIERS[TIERS.length - 1].size * scale);
      props['--drift'] = `${(settings.starDrift * depth).toFixed(2)}px`;
      props['--drift-period'] = `${rand(70, 140).toFixed(0)}s`;
      props['--drift-delay'] = `${(-rand(0, 140)).toFixed(0)}s`;
    }

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

export function renderStarfield(settings: SkywalkerSettings): void {
  removeStarfield();
  if (!settings.starfieldEnabled || settings.starCount < 1) return;

  const bandHeight = settings.starHeight;
  const topArea = window.innerWidth * bandHeight;
  if (topArea <= 0) return;
  // One count, spread at a constant density, so a tall sidebar is not as sparse
  // as a thin strip and the slider keeps meaning the same thing everywhere.
  const density = settings.starCount / topArea;

  let drew = false;

  for (const region of REGIONS) {
    if (!region.enabled(settings)) continue;

    const hosts =
      region.selector === 'body'
        ? [document.body]
        : region.all
          ? Array.from(document.querySelectorAll<HTMLElement>(region.selector))
          : [document.querySelector<HTMLElement>(region.selector)].filter(Boolean as unknown as (v: HTMLElement | null) => v is HTMLElement);

    for (const host of hosts) {

    const rect = region.fixedBand
      ? { width: window.innerWidth, height: bandHeight }
      : host.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;

    // A sidebar is some twenty-five times the area of the top strip, so the same
    // density would put well over a thousand animated elements down each side.
    // They read better sparser anyway, and the browser has less to do.
    // The ceiling is the user's, not ours: it is there to keep a large display
    // from quietly turning into thousands of animated elements. The formula
    // decides the number underneath it. When the ceiling is doing the deciding
    // instead, density stops being constant and the whole calculation is just a
    // constant in disguise.
    const spread = region.edge ? EDGE_DENSITY : 1;
    const count = Math.min(Math.round(density * rect.width * rect.height * spread), settings.starMax);
    if (count < 1) continue;

    const container = host.createDiv({
      cls: region.fixedBand ? `${CONTAINER_CLASS} ${CONTAINER_CLASS}-band` : CONTAINER_CLASS,
    });
    container.setAttribute('aria-hidden', 'true');

    const brightness = region.edge
      ? (settings.starBrightness / 100) * (settings.starEdgeBrightness / 100)
      : settings.starBrightness / 100;

    container.setCssProps({
      '--loop-starfield-height': `${bandHeight}px`,
      '--loop-star-brightness': `${brightness.toFixed(3)}`,
    });

    fill(container, count, settings);
    drew = true;
    }
  }

  // Marks that a real starfield is on screen, so the theme's own version steps
  // aside. Keyed to drawing rather than to the plugin being installed.
  if (drew) document.body.addClass(ACTIVE_CLASS);
}

export function removeStarfield(): void {
  document.body.findAll(`.${CONTAINER_CLASS}`).forEach((el) => el.detach());
  document.body.removeClass(ACTIVE_CLASS);
}
