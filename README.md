# LOOP - Skywalker Settings

Companion plugin for the [LOOP - Skywalker](https://github.com/theloop-am/loop-skywalker)
Obsidian theme.

The theme works on its own. This plugin only adds the things a stylesheet cannot
do, and the theme keeps its own fallback for each of them.

## What it adds

### Your own artwork

A theme cannot use an image from your vault. Vault files are served from
`app://<per-install hash>/<absolute path>`, the hash is not knowable ahead of
time, and CSS has no way to read a path out of a setting and build a `url()`
from it.

This plugin resolves the file you pick and hands the theme a CSS variable:

| Setting | Variable | Used for |
| --- | --- | --- |
| Logo in place of the vault name | `--loop-vault-logo` | the sidebar's vault name |
| Logo over the navigation banner | `--loop-banner-logo` | Notebook Navigator's banner |

The theme masks and recolours whatever you point these at, so a single-colour
SVG will follow your light and dark palettes. Without the plugin the theme falls
back to its own LOOP marks.

### A real starfield

The theme draws stars in CSS. One pseudo-element can only carry one opacity
animation, so every star inside it pulses in unison — six pseudo-elements means
six groups, and there is no way around it.

Here every star is its own element, so the count is an actual count and no two
are in step. The field follows a few rules borrowed from
[jo_Geek's Night Sky pen](https://codepen.io/jo_Geek/pen/EOKvLE) (MIT), which
get right what is easy to miss:

- stars come in a few discrete sizes rather than a continuous spread;
- only the largest carry a glow, the rest stay bare points;
- small stars blink quickly, large ones slowly;
- and most of the sky holds still. Only a share of the stars blink at all, and
  those that do go all the way to zero rather than merely dimming.

A sky where everything pulses gently at once reads as decoration. A sky where
most points sit still and a few wink out entirely reads as a sky.

While the plugin is drawing stars it sets `loop-starfield-active` on `body` and
the theme's CSS version steps aside. Switch the plugin's stars off and the
theme's come back.

## Install

Not in the community catalogue. Use [BRAT](https://github.com/TfTHacker/obsidian42-brat)
with `theloop-am/loop-skywalker-settings`, or copy `main.js`, `manifest.json` and
`styles.css` into `<vault>/.obsidian/plugins/loop-skywalker-settings/`.

## Development

```sh
npm install
npm run dev     # watch, copy into the vault, reload through the Obsidian CLI
npm run build   # type-check and produce a production main.js
```

`npm run dev` reads `OBSIDIAN_PATH` from a `.env` file — the path to your vault's
plugins folder relative to `$HOME` — and reloads the plugin after each rebuild
using the `obsidian` CLI, if it is on your `PATH`.

## Credits

The build pipeline is adapted from kepano's
[Minimal Theme Settings](https://github.com/kepano/obsidian-minimal-settings)
(MIT), which is also the model for how a theme and its companion should divide
the work: the theme stays complete on its own, the plugin only extends it.

## License

MIT. See [LICENSE](LICENSE).
