/*
 * Skywalker Settings - Plugin for Obsidian
 * Copyright (c) 2026 theLOOP
 * SPDX-License-Identifier: MIT
 */

/**
 * English strings, and the shape every other locale is checked against.
 *
 * Each entry carries what it is for and its English text, so a translator reads
 * the original next to the translation without leaving the file.
 *
 * Product names are never translated: Obsidian, LOOP, Skywalker, Notebook
 * Navigator.
 */
import { forms } from '../forms.ts';

export const STRINGS_EN = {
  commands: {
    toggleStarfield: 'Toggle starfield', // Command that switches the sky on and off (English: Toggle starfield)
    rearrangeStarfield: 'Rearrange starfield', // Command that scatters the stars again (English: Rearrange starfield)
    nextLayout: 'Life calendar: next layout', // Command that cycles the calendar's layout (English: Life calendar: next layout)
    layoutNow: 'Life calendar: {layout}', // Notice naming the layout just switched to (English: Life calendar: Ribbon)
  },

  starfield: {
    heading: 'Starfield', // Heading above the starfield settings (English: Starfield)
    enabled: 'Starfield', // Toggle that draws the sky at all (English: Starfield)
    enabledDesc: 'Stars across the top of the window. Dark mode only.', // Says where the stars go and when (English: Stars across the top of the window. Dark mode only.)
    style: 'Style', // Dropdown holding the presets (English: Style)
    styleDesc:
      'Presets set the sky, the twinkle and the warmth. Moving any of those yourself switches this to Custom.', // Explains what a preset owns (English: Presets set the sky, the twinkle and the warmth. Moving any of those yourself switches this to Custom.)
    regionTop: 'Top of the window', // Toggle for the band above the tabs (English: Top of the window)
    regionLeft: 'Left sidebar', // Toggle for the left sidebar (English: Left sidebar)
    regionRight: 'Right sidebar', // Toggle for the right sidebar (English: Right sidebar)
    edgeBrightness: 'Brightness in panes', // Slider dimming every pane against the top strip (English: Brightness in panes)
    edgeBrightnessDesc:
      'Panes are dimmed against the top, so they stay behind what you are reading.', // Explains why they are dimmer (English: Panes are dimmed against the top, so they stay behind what you are reading.)
    drift: 'Parallax', // Slider for how far nearer stars drift (English: Parallax)
    driftDesc: 'Nearer stars drift further than distant ones. Very slow, and off by default.', // Explains the drift (English: Nearer stars drift further than distant ones. Very slow, and off by default.)
    driftOff: 'Off', // Shown instead of a distance when the slider is at zero (English: Off)
    height: 'Height', // Slider for how far down the band reaches (English: Height)
    heightDesc: 'How far down from the top the stars reach. Sidebars fill their own height.', // Explains what the height covers (English: How far down from the top the stars reach. Sidebars fill their own height.)
    graph: 'Graph view', // Toggle for the sky behind the graph (English: Graph view)
    graphDesc: 'Behind the nodes, in both the full graph and the local one.', // Says where it goes (English: Behind the nodes, in both the full graph and the local one.)
    emptyTab: 'Show on empty tabs', // Toggle for the New tab pane (English: Show on empty tabs)
    emptyTabDesc: 'Obsidian’s New tab pane, where there is nothing to read.', // Names the pane it means (English: Obsidian's New tab pane, where there is nothing to read.)
    max: 'Most stars in one area', // Slider capping the count per region (English: Most stars in one area)
    maxDesc:
      'A ceiling, so a large display does not end up with thousands of them. Raise it if the panes look sparser than the top bar.', // Explains the ceiling (English: A ceiling, so a large display does not end up with thousands of them. Raise it if the panes look sparser than the top bar.)
    rearrange: 'Rearrange stars', // Row holding the rearrange button (English: Rearrange stars)
    rearrangeDesc: 'Scatter them into a new arrangement.', // Says what the button does (English: Scatter them into a new arrangement.)
    rearrangeAction: 'Rearrange', // The button itself (English: Rearrange)
  },

  sky: {
    heading: 'Sky', // Heading above the count, size and brightness (English: Sky)
    count: 'Stars', // Slider for how many stars there are (English: Stars)
    countDesc: 'How many stars in the sky.', // Explains the count (English: How many stars in the sky.)
    size: 'Size', // Slider scaling every star (English: Size)
    sizeDesc: 'Scales every star. Larger stars glow, smaller ones do not.', // Explains what size changes (English: Scales every star. Larger stars glow, smaller ones do not.)
    brightness: 'Brightness', // Slider for how bright the stars are (English: Brightness)
  },

  twinkle: {
    heading: 'Twinkle', // Heading above the blink settings (English: Twinkle)
    share: 'Stars that twinkle', // Slider for the share of stars that blink (English: Stars that twinkle)
    shareDesc: 'The rest stay lit.', // Says what the others do (English: The rest stay lit.)
    speed: 'Twinkle speed', // Slider for how fast they blink (English: Twinkle speed)
  },

  colour: {
    heading: 'Star color', // Heading above the two colours (English: Star color)
    base: 'Stars', // Colour of most stars (English: Stars)
    warm: 'Warm stars', // The second colour (English: Warm stars)
    warmDesc: 'A second color, for variation.', // Explains why there are two (English: A second color, for variation.)
    warmShare: 'How many are warm', // Slider for the share taking the second colour (English: How many are warm)
  },

  presets: {
    headliner: 'Headliner', // Preset: sparse and calm (English: Headliner)
    deepSky: 'Deep sky', // Preset: dense and almost still (English: Deep sky)
    sparkle: 'Sparkle', // Preset: few stars, most of them blinking (English: Sparkle)
    embers: 'Embers', // Preset: large, slow and warm (English: Embers)
    custom: 'Custom', // Shown once a slider a preset owns has moved (English: Custom)
  },

  lifegrid: {
    heading: 'Life calendar', // Heading above the calendar settings (English: Life calendar)
    enabled: 'Life calendar', // Toggle that draws the calendar at all (English: Life calendar)
    enabledDesc: 'One cell per week of your life, drawn behind the actions on the New tab.', // Says what a cell is and where it goes (English: One cell per week of your life, drawn behind the actions on the New tab.)
    birth: 'Date of birth', // Date field the calendar counts from (English: Date of birth)
    birthDesc: 'Where the calendar starts. Nothing is drawn until this is set.', // Says the calendar needs it (English: Where the calendar starts. Nothing is drawn until this is set.)
    years: 'Years to show', // Slider for how far ahead the grid reaches (English: Years to show)
    yearsDesc: 'How far ahead the grid reaches.', // Explains the span (English: How far ahead the grid reaches.)
    yearCount: forms({ one: 'year', other: 'years' }), // Counted noun for the span slider (English: 90 years)
    layout: 'Layout', // Dropdown choosing how the weeks are arranged (English: Layout)
    layoutDesc:
      'A row per year starts every row on your birthday, so about one row in six runs a cell longer. Ribbon makes no claim about years and breaks rows at the pane edge.', // Explains the difference between the two (English: A row per year starts every row on your birthday, so about one row in six runs a cell longer. Ribbon makes no claim about years and breaks rows at the pane edge.)
    layoutAgeyear: 'A row per year of life', // Layout option: rows start on the birthday (English: A row per year of life)
    layoutRibbon: 'Ribbon — wraps to the pane', // Layout option: rows break at the pane edge (English: Ribbon — wraps to the pane)
    cell: 'Cell size', // Slider sizing a week in the ribbon layout (English: Cell size)
    cellDesc: 'The other layouts size their cells to fit the pane.', // Says why it applies to one layout (English: The other layouts size their cells to fit the pane.)
    width: 'Width', // Slider for how much of the pane the calendar spans (English: Width)
    widthDesc: 'How much of the pane the calendar spans.', // Explains the width (English: How much of the pane the calendar spans.)
    tint: 'Colour', // Dropdown choosing what colours the filled weeks (English: Colour)
    tintDesc: 'What tints the filled weeks and the week in progress.', // Explains what is tinted (English: What tints the filled weeks and the week in progress.)
    tintNeutral: 'Neutral — the theme’s greys', // Tint option: the theme's greys (English: Neutral — the theme's greys)
    tintAccent: 'The theme’s accent', // Tint option: the theme's accent colour (English: The theme's accent)
    tintCustom: 'A colour of your own', // Tint option: a colour the user picks (English: A colour of your own)
    custom: 'Custom colour', // The colour picker shown for the option above (English: Custom colour)
    strength: 'Strength', // Slider for how far the weeks come forward (English: Strength)
    strengthDesc: 'How far the weeks come forward against the background.', // Explains the strength (English: How far the weeks come forward against the background.)
    caption: 'Caption', // Toggle for the three lines under the grid (English: Caption)
    captionDesc: 'The flight day, the weeks behind you and where the calendar stands.', // Names what the caption says (English: The flight day, the weeks behind you and where the calendar stands.)
    captionStrength: 'Caption strength', // Slider for how bright the caption is (English: Caption strength)
    captionStrengthDesc: 'Set apart from the grid, so the lines can read brighter than it does.', // Explains why it is separate (English: Set apart from the grid, so the lines can read brighter than it does.)
    bare: 'Hide the tab’s own actions', // Toggle that leaves the calendar alone on the tab (English: Hide the tab's own actions)
    bareDesc:
      'Leaves the calendar alone on the New tab. Create note and Go to file keep their shortcuts, and the tab still closes.', // Says what is still reachable (English: Leaves the calendar alone on the New tab. Create note and Go to file keep their shortcuts, and the tab still closes.)
    flightDay: 'Flight day {day}', // First caption line, counting days since birth (English: Flight day 12,345)
    progress: '{lived} of {total} · {share}%', // Second caption line, weeks behind and the share (English: 1,234 of 4,695 weeks · 26%)
    weekCount: forms({ one: 'week', other: 'weeks' }), // Counted noun used in the line above (English: 4,695 weeks)
  },

  logos: {
    heading: 'Logos', // Heading above the two image pickers (English: Logos)
    vault: 'Sidebar logo', // Image shown instead of the vault name (English: Sidebar logo)
    vaultDesc: 'Shown instead of the vault name. Single-color SVGs take on the theme’s colors.', // Says what happens to an SVG (English: Shown instead of the vault name. Single-color SVGs take on the theme's colors.)
    banner: 'Banner logo', // Image shown over the navigation banner (English: Banner logo)
    bannerDesc: 'Shown over the banner image set in Notebook Navigator.', // Names where the banner comes from (English: Shown over the banner image set in Notebook Navigator.)
    choose: 'Choose an image', // Placeholder in both pickers (English: Choose an image)
  },
};
