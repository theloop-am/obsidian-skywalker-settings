# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The version in the heading, in `manifest.json`, in `versions.json` and on the git tag is one number.
A release copies its section from this file and nothing is retyped: `mise run test:release` refuses a
release where those four disagree.

<!-- How an entry is written:

- Categories are Added, Changed, Deprecated, Removed, Fixed and Security, in that order. A category
  with nothing under it is left out.
- One line per change, saying what changed - not what it is worth. No "powerful", "seamlessly",
  "greatly improved": an adjective a reader cannot check is noise.
- Name things the way the interface names them, so a reader can go and find them.
- A fix says what was wrong. "Fixed a bug" matches nobody's problem.
- Write it for the person installing the update, not for the person who wrote the commit.

## [9.9.9] - 9090-09-09

### Added
### Changed
### Fixed

-->

## Unreleased

## [0.1.0] - 2026-09-09

### Added

- A starfield drawn on canvas, across the top of the window and optionally down either sidebar,
  onto empty tabs and behind the graph. Stars come in discrete sizes, only the largest carry a glow,
  and most of the sky holds still while the few that blink go fully out rather than dimming.
- Four presets — Headliner, Deep sky, Sparkle and Embers — each setting the count, size, brightness,
  twinkle and warmth together. Moving any slider a preset owns switches the dropdown to Custom, so
  it never claims something the sky is not doing.
- Parallax, so nearer stars drift further than distant ones, and a ceiling on how many stars one
  area may hold.
- A life calendar behind the actions on the New tab: one cell per week, in a row per year of life or
  as a ribbon that wraps to the pane, with a caption giving the flight day, the weeks behind you and
  the ISO week the calendar stands on.
- Vault images handed to the theme as `--loopsk-vault-logo` and `--loopsk-banner-logo`, which is the one
  thing a stylesheet cannot do for itself: a vault file is served from a per-install address that
  CSS has no way to build.
- Commands to toggle the starfield, rearrange it, and step the life calendar through its layouts.
- Translated interface following the language selected in Obsidian.
