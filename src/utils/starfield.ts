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
/** Kept in step with the transition in styles.css. */
const FADE_MS = 320;

/** One star leaving, because its pane no longer has room for it. */
function fadeOutStar(star: HTMLElement): void {
  star.addClass('is-disappearing');
  window.setTimeout(() => star.detach(), FADE_MS + 40);
}

/** Fade a field out and drop it once it has gone, rather than yanking it. */
function retire(el: HTMLElement): void {
  if (el.classList.contains('is-leaving')) return;
  el.addClass('is-leaving');
  window.setTimeout(() => el.detach(), FADE_MS + 40);
}

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

function fill(container: HTMLElement, count: number, settings: SkywalkerSettings, fadeIn = false): void {
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
    if (fadeIn) classes.push('is-appearing');
    const star = container.createDiv({ cls: classes.join(' ') });
    if (fadeIn) window.requestAnimationFrame(() => star.removeClass('is-appearing'));

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

/** Everything about the settings that changes what a field looks like. If this
 *  is unchanged and the box is the same size, the field on screen is already
 *  correct and rebuilding it would only shuffle the stars for no reason. */
function signature(settings: SkywalkerSettings): string {
  return [
    settings.starCount,
    settings.starMax,
    settings.starScale,
    settings.starSpeed,
    settings.starBlinkShare,
    settings.starBrightness,
    settings.starEdgeBrightness,
    settings.starWarmShare,
    settings.starColor,
    settings.starWarmColor,
    settings.starDrift,
    settings.starHeight,
  ].join('|');
}

export function renderStarfield(settings: SkywalkerSettings): void {
  if (!settings.starfieldEnabled || settings.starCount < 1) {
    removeStarfield();
    return;
  }

  const bandHeight = settings.starHeight;
  const topArea = window.innerWidth * bandHeight;
  if (topArea <= 0) return;
  const density = settings.starCount / topArea;
  const sig = signature(settings);

  const kept = new Set<HTMLElement>();
  let drew = false;

  for (const region of REGIONS) {
    if (!region.enabled(settings)) continue;

    const hosts =
      region.selector === 'body'
        ? [document.body]
        : Array.from(document.querySelectorAll<HTMLElement>(region.selector));

    for (const host of hosts) {
      const rect = region.fixedBand
        ? { width: window.innerWidth, height: bandHeight }
        : host.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;

      const box = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
      const existing = Array.from(host.children).find(
        (el): el is HTMLElement =>
          el instanceof HTMLElement &&
          el.classList.contains(CONTAINER_CLASS) &&
          !el.classList.contains('is-leaving')
      );

      const spread = region.edge ? EDGE_DENSITY : 1;
      const wanted = Math.min(
        Math.round(density * rect.width * rect.height * spread),
        settings.starMax
      );
      if (wanted < 1) continue;

      // A pane getting wider does not rearrange the sky above it; you simply see
      // more of it. So a field is never replaced when only its size changed. The
      // stars already stretch with the pane, since their positions are
      // percentages, and all that is missing is the few the extra room should
      // hold. Fading between two arrangements reads as a slide transition
      // however smooth the fade, because it is two skies rather than one.
      if (existing && existing.dataset.sig === sig) {
        const have = existing.childElementCount;
        if (wanted > have) {
          fill(existing, wanted - have, settings, true);
        } else if (wanted < have) {
          // Taken from the end, so the ones that stay do not move.
          for (let i = have - 1; i >= wanted; i--) {
            const star = existing.children[i];
            if (star instanceof HTMLElement) fadeOutStar(star);
          }
        }
        existing.dataset.box = box;
        kept.add(existing);
        drew = true;
        continue;
      }

      if (existing) retire(existing);

      const container = host.createDiv({
        cls: region.fixedBand ? `${CONTAINER_CLASS} ${CONTAINER_CLASS}-band` : CONTAINER_CLASS,
      });
      container.setAttribute('aria-hidden', 'true');
      container.dataset.sig = sig;
      container.dataset.box = box;
      // Born transparent and released on the next frame. Setting and clearing it
      // in one frame collapses to no change, and there is nothing to transition.
      container.addClass('is-entering');
      window.requestAnimationFrame(() => container.removeClass('is-entering'));

      const brightness = region.edge
        ? (settings.starBrightness / 100) * (settings.starEdgeBrightness / 100)
        : settings.starBrightness / 100;

      container.setCssProps({
        '--loop-starfield-height': `${bandHeight}px`,
        '--loop-star-brightness': `${brightness.toFixed(3)}`,
      });

      fill(container, wanted, settings);
      kept.add(container);
      drew = true;
    }
  }

  // Fields whose pane has gone, or that a setting has turned off.
  for (const el of document.body.findAll(`.${CONTAINER_CLASS}`)) {
    if (!kept.has(el as HTMLElement)) retire(el as HTMLElement);
  }

  document.body.toggleClass(ACTIVE_CLASS, drew);
}

export function removeStarfield(): void {
  document.body.findAll(`.${CONTAINER_CLASS}`).forEach((el) => el.detach());
  document.body.removeClass(ACTIVE_CLASS);
}
