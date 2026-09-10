# Skywalker Settings

Companion for [Skywalker](https://github.com/theloop-am/obsidian-skywalker) — a dark theme for
Obsidian with nine flavours light and dark, fourteen accents, and almost everything a switch in
Style Settings.

The theme is complete on its own. This plugin adds the three things a stylesheet cannot draw for
itself, and the theme keeps its own fallback for each of them. More widgets will follow.

Source:
[theloop-am/obsidian-skywalker-settings](https://github.com/theloop-am/obsidian-skywalker-settings).

[![Check](https://github.com/theloop-am/obsidian-skywalker-settings/actions/workflows/check.yml/badge.svg)](https://github.com/theloop-am/obsidian-skywalker-settings/actions/workflows/check.yml)
[![Security scan](https://github.com/theloop-am/obsidian-skywalker-settings/actions/workflows/codeql.yml/badge.svg)](https://github.com/theloop-am/obsidian-skywalker-settings/actions/workflows/codeql.yml)
[![Obsidian checks](https://github.com/theloop-am/obsidian-skywalker-settings/actions/workflows/obsidian.yml/badge.svg)](https://github.com/theloop-am/obsidian-skywalker-settings/actions/workflows/obsidian.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/theloop-am/obsidian-skywalker-settings/badge)](https://securityscorecards.dev/viewer/?uri=github.com/theloop-am/obsidian-skywalker-settings)
![Obsidian](https://img.shields.io/badge/Obsidian-1.13.0+-483699?logo=obsidian&style=flat-square)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Contents

- [1 Installation](#1-installation)
- [2 A starfield](#2-a-starfield)
- [3 A life calendar](#3-a-life-calendar)
- [4 Your own artwork](#4-your-own-artwork)
- [5 Quality](#5-quality)
- [6 Privacy](#6-privacy)
- [7 Languages](#7-languages)
- [8 Development](#8-development)
- [9 License](#9-license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## 1 Installation

In Obsidian: Settings → Community plugins → Browse, then search for Skywalker Settings.

By hand: download `main.js`, `manifest.json` and `styles.css` from the
[latest release](https://github.com/theloop-am/obsidian-skywalker-settings/releases/latest), put
them in `<vault>/.obsidian/plugins/skywalker-settings/`, then enable the plugin under Settings →
Community plugins.

Requires Obsidian 1.13.0 or later. The theme is not required, and neither is this plugin.

## 2 A starfield

Stars across the top of the window, and down either sidebar or onto empty tabs if you want them
there. One canvas per area, so the count is a real count: thousands cost no more frames than
seventy.

It follows four rules, which are what separate a sky from a decoration:

- stars come in a few discrete sizes rather than a continuous spread;
- only the largest carry a glow, the rest stay bare points;
- small stars blink quickly, large ones slowly;
- and most of the sky holds still. Only a share of the stars blink at all, and those that do go all
  the way to zero rather than merely dimming.

A sky where everything pulses gently at once reads as decoration. A sky where most points sit still
and a few wink out entirely reads as a sky.

Four presets cover most of it, and each sets the count, size, brightness, twinkle and warmth
together:

| Preset | What it looks like |
| --- | --- |
| Headliner | Sparse and calm, like the roof of a car |
| Deep sky | Dense and almost still, the way a clear night actually looks |
| Sparkle | Fewer stars, most of them blinking, quickly |
| Embers | Large, slow and warm |

The individual sliders stay out of the way until you pick Custom, and moving any of them switches
the preset to Custom, so the dropdown never claims something the sky is not doing.

Asked for less movement in your system settings, you get a still sky rather than a stopped one: the
stars stay, they simply hold their brightness. A hidden window paints nothing at all.

## 3 A life calendar

One cell per week of your life, drawn behind the actions on the New tab. Set a date of birth and
nothing else is required.

| Layout | How the weeks are arranged |
| --- | --- |
| A row per year of life | Every row starts on your birthday, so about one row in six runs a cell longer |
| Ribbon | Makes no claim about years and breaks rows at the pane edge |

Under it, if you want it, three lines: the flight day, the weeks behind you against the weeks the
calendar spans, and the ISO week the calendar stands on.

The grid sizes itself to the pane it is in, down to a floor below which it draws nothing rather than
something unreadable. It is marked as decoration, so a screen reader is not read four thousand empty
cells.

## 4 Your own artwork

A theme cannot use an image from your vault. Vault files are served from
`app://<per-install hash>/<absolute path>`, the hash is not knowable ahead of time, and CSS has no
way to read a path out of a setting and build a `url()` from it.

This plugin resolves the file you pick and hands the theme a CSS variable:

| Setting | Variable | Used for |
| --- | --- | --- |
| Sidebar logo | `--loopsk-vault-logo` | the sidebar's vault name |
| Banner logo | `--loopsk-banner-logo` | Notebook Navigator's banner |

The theme reads each as `var(--loopsk-vault-logo, url(its own mark))`, so an unset variable already
means "use the theme's own". It masks and recolours whatever you point these at, so a single-colour
SVG follows your light and dark palettes.

That is the whole contract. The plugin sets no classes the theme has to know about.

## 5 Quality

Every change passes the same gates before it lands: [biome](https://biomejs.dev/),
[ESLint](https://eslint.org/) with the official
[Obsidian plugin](https://github.com/obsidianmd/eslint-plugin),
[TypeScript](https://www.typescriptlang.org/) with `strict` and then some,
[Vitest](https://vitest.dev/), [knip](https://knip.dev/) for dead code, the stylesheet under the
ruleset the community directory scans with, and three checks of our own — one that no translated
string is unused or missing, one that the code and the stylesheet agree about class names, one that
the manifest and the changelog agree about the version.

`mise run check` is the whole set, and it runs again before every push.

## 6 Privacy

No network requests of any kind. No telemetry, no update checks, no downloads.

The plugin opens exactly the files you point it at in the two logo settings, and only to ask
Obsidian for their address. It reads nothing else in your vault. Your settings, the date of birth
among them, are stored in `data.json` inside the plugin's folder and go nowhere else.

Released files carry build provenance, so an installed copy can be traced back to the workflow run
that produced it.

## 7 Languages

The interface follows the language selected in Obsidian — the settings, the command names, the
calendar's caption and the plugin's own messages are all translated, and English stands in wherever
a translation has not caught up. More languages are added over time: one is a file of strings and
needs no other change to the plugin.

## 8 Development

```bash
mise install && mise deps       # tools, then dependencies
mise run check                  # every gate
VAULT=/path/to/vault mise run dev              # watch, copy into the vault, reload
VAULT=/path/to/vault mise run plugin:install   # build and copy once
```

`mise run dev` reloads the plugin through the `obsidian` CLI after each rebuild, if it is on your
`PATH`, and type-checks first so a half-saved file is never copied in.

## 9 License

MIT. See [LICENSE](LICENSE).
