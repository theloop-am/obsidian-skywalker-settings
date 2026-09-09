/*
 * Skywalker Settings - Plugin for Obsidian
 * Copyright (c) 2026 theLOOP
 * SPDX-License-Identifier: MIT
 */

import { forms } from '../forms.ts';
import type { STRINGS_EN } from './en';

/**
 * Russian strings. Typed against English, so a missing key is a build error.
 *
 * Product names stay as they are: Obsidian, LOOP, Skywalker, Notebook Navigator.
 */
export const STRINGS_RU: typeof STRINGS_EN = {
  commands: {
    toggleStarfield: 'Включить или выключить звёздное небо', // Command that switches the sky on and off (English: Toggle starfield)
    rearrangeStarfield: 'Пересобрать звёздное небо', // Command that scatters the stars again (English: Rearrange starfield)
    nextLayout: 'Календарь жизни: следующая раскладка', // Command that cycles the calendar's layout (English: Life calendar: next layout)
    layoutNow: 'Календарь жизни: {layout}', // Notice naming the layout just switched to (English: Life calendar: Ribbon)
  },

  starfield: {
    heading: 'Звёздное небо', // Heading above the starfield settings (English: Starfield)
    enabled: 'Звёздное небо', // Toggle that draws the sky at all (English: Starfield)
    enabledDesc: 'Звёзды по верху окна. Только в тёмной теме.', // Says where the stars go and when (English: Stars across the top of the window. Dark mode only.)
    style: 'Стиль', // Dropdown holding the presets (English: Style)
    styleDesc:
      'Пресет задаёт плотность неба, мерцание и теплоту разом. Стоит подвинуть любой из этих ползунков — и он переключится на «Свой».', // Explains what a preset owns (English: Presets set the sky, the twinkle and the warmth. Moving any of those yourself switches this to Custom.)
    regionTop: 'Верх окна', // Toggle for the band above the tabs (English: Top of the window)
    regionLeft: 'Левая панель', // Toggle for the left sidebar (English: Left sidebar)
    regionRight: 'Правая панель', // Toggle for the right sidebar (English: Right sidebar)
    edgeBrightness: 'Яркость на панелях', // Slider dimming the sidebars against the top (English: Sidebar brightness)
    edgeBrightnessDesc: 'Панели приглушены относительно верха, чтобы оставаться на заднем плане.', // Explains why they are dimmer (English: Sidebars are dimmed against the top, so they stay in the background.)
    drift: 'Параллакс', // Slider for how far nearer stars drift (English: Parallax)
    driftDesc: 'Ближние звёзды смещаются сильнее дальних. Очень медленно, и по умолчанию выключено.', // Explains the drift (English: Nearer stars drift further than distant ones. Very slow, and off by default.)
    driftOff: 'Выключен', // Shown instead of a distance when the slider is at zero (English: Off)
    height: 'Высота', // Slider for how far down the band reaches (English: Height)
    heightDesc: 'Насколько далеко вниз от верха доходят звёзды. Панели заполняются на всю высоту.', // Explains what the height covers (English: How far down from the top the stars reach. Sidebars fill their own height.)
    emptyTab: 'Показывать на пустых вкладках', // Toggle for the New tab pane (English: Show on empty tabs)
    emptyTabDesc: 'Панель новой вкладки Obsidian, где читать нечего.', // Names the pane it means (English: Obsidian's New tab pane, where there is nothing to read.)
    max: 'Больше всего звёзд в одной области', // Slider capping the count per region (English: Most stars in one area)
    maxDesc:
      'Потолок, чтобы на большом экране их не оказались тысячи. Поднимите его, если панели выглядят реже верхней полосы.', // Explains the ceiling (English: A ceiling, so a large display does not end up with thousands of them. Raise it if the panes look sparser than the top bar.)
    rearrange: 'Пересобрать звёзды', // Row holding the rearrange button (English: Rearrange stars)
    rearrangeDesc: 'Рассыпать их заново.', // Says what the button does (English: Scatter them into a new arrangement.)
    rearrangeAction: 'Пересобрать', // The button itself (English: Rearrange)
  },

  sky: {
    heading: 'Небо', // Heading above the count, size and brightness (English: Sky)
    count: 'Звёзды', // Slider for how many stars there are (English: Stars)
    countDesc: 'Сколько звёзд на небе.', // Explains the count (English: How many stars in the sky.)
    size: 'Размер', // Slider scaling every star (English: Size)
    sizeDesc: 'Масштабирует каждую звезду. Крупные светятся ореолом, мелкие — нет.', // Explains what size changes (English: Scales every star. Larger stars glow, smaller ones do not.)
    brightness: 'Яркость', // Slider for how bright the stars are (English: Brightness)
  },

  twinkle: {
    heading: 'Мерцание', // Heading above the blink settings (English: Twinkle)
    share: 'Сколько звёзд мерцает', // Slider for the share of stars that blink (English: Stars that twinkle)
    shareDesc: 'Остальные горят ровно.', // Says what the others do (English: The rest stay lit.)
    speed: 'Скорость мерцания', // Slider for how fast they blink (English: Twinkle speed)
  },

  colour: {
    heading: 'Цвет звёзд', // Heading above the two colours (English: Star color)
    base: 'Звёзды', // Colour of most stars (English: Stars)
    warm: 'Тёплые звёзды', // The second colour (English: Warm stars)
    warmDesc: 'Второй цвет, для разнообразия.', // Explains why there are two (English: A second color, for variation.)
    warmShare: 'Сколько из них тёплых', // Slider for the share taking the second colour (English: How many are warm)
  },

  presets: {
    headliner: 'Звёздный потолок', // Preset: sparse and calm (English: Headliner)
    deepSky: 'Глубокое небо', // Preset: dense and almost still (English: Deep sky)
    sparkle: 'Искры', // Preset: few stars, most of them blinking (English: Sparkle)
    embers: 'Угли', // Preset: large, slow and warm (English: Embers)
    custom: 'Свой', // Shown once a slider a preset owns has moved (English: Custom)
  },

  lifegrid: {
    heading: 'Календарь жизни', // Heading above the calendar settings (English: Life calendar)
    enabled: 'Календарь жизни', // Toggle that draws the calendar at all (English: Life calendar)
    enabledDesc: 'Одна клетка на неделю вашей жизни, позади кнопок новой вкладки.', // Says what a cell is and where it goes (English: One cell per week of your life, drawn behind the actions on the New tab.)
    birth: 'Дата рождения', // Date field the calendar counts from (English: Date of birth)
    birthDesc: 'Отсюда календарь считает. Пока она не задана, ничего не рисуется.', // Says the calendar needs it (English: Where the calendar starts. Nothing is drawn until this is set.)
    years: 'Сколько лет показывать', // Slider for how far ahead the grid reaches (English: Years to show)
    yearsDesc: 'Насколько далеко вперёд уходит сетка.', // Explains the span (English: How far ahead the grid reaches.)
    yearCount: forms({ one: 'год', few: 'года', many: 'лет', other: 'года' }), // Counted noun for the span slider (English: 90 years)
    layout: 'Раскладка', // Dropdown choosing how the weeks are arranged (English: Layout)
    layoutDesc:
      '«Строка на год жизни» начинает каждую строку в ваш день рождения, поэтому примерно каждая шестая строка на клетку длиннее. «Лента» ничего не обещает про годы и переносит строки по краю панели.', // Explains the difference between the two (English: A row per year starts every row on your birthday, so about one row in six runs a cell longer. Ribbon makes no claim about years and breaks rows at the pane edge.)
    layoutAgeyear: 'Строка на год жизни', // Layout option: rows start on the birthday (English: A row per year of life)
    layoutRibbon: 'Лента — по ширине панели', // Layout option: rows break at the pane edge (English: Ribbon — wraps to the pane)
    cell: 'Размер клетки', // Slider sizing a week in the ribbon layout (English: Cell size)
    cellDesc: 'В остальных раскладках клетки подбираются под панель.', // Says why it applies to one layout (English: The other layouts size their cells to fit the pane.)
    width: 'Ширина', // Slider for how much of the pane the calendar spans (English: Width)
    widthDesc: 'Какую часть панели занимает календарь.', // Explains the width (English: How much of the pane the calendar spans.)
    tint: 'Цвет', // Dropdown choosing what colours the filled weeks (English: Colour)
    tintDesc: 'Чем подкрашены прожитые недели и текущая.', // Explains what is tinted (English: What tints the filled weeks and the week in progress.)
    tintNeutral: 'Нейтральный — серые темы', // Tint option: the theme's greys (English: Neutral — the theme's greys)
    tintAccent: 'Акцентный цвет темы', // Tint option: the theme's accent colour (English: The theme's accent)
    tintCustom: 'Цвет на ваш выбор', // Tint option: a colour the user picks (English: A colour of your own)
    custom: 'Свой цвет', // The colour picker shown for the option above (English: Custom colour)
    strength: 'Насыщенность', // Slider for how far the weeks come forward (English: Strength)
    strengthDesc: 'Насколько недели выступают на фоне.', // Explains the strength (English: How far the weeks come forward against the background.)
    caption: 'Подпись', // Toggle for the three lines under the grid (English: Caption)
    captionDesc: 'День полёта, прожитые недели и где стоит календарь.', // Names what the caption says (English: The flight day, the weeks behind you and where the calendar stands.)
    captionStrength: 'Насыщенность подписи', // Slider for how bright the caption is (English: Caption strength)
    captionStrengthDesc: 'Отделена от сетки, чтобы строки читались ярче неё.', // Explains why it is separate (English: Set apart from the grid, so the lines can read brighter than it does.)
    bare: 'Скрыть кнопки самой вкладки', // Toggle that leaves the calendar alone on the tab (English: Hide the tab's own actions)
    bareDesc:
      'Оставляет календарь на новой вкладке одного. «Создать заметку» и «Перейти к файлу» сохраняют свои сочетания клавиш, и вкладка по-прежнему закрывается.', // Says what is still reachable (English: Leaves the calendar alone on the New tab. Create note and Go to file keep their shortcuts, and the tab still closes.)
    flightDay: 'День полёта {day}', // First caption line, counting days since birth (English: Flight day 12,345)
    progress: '{lived} из {total} · {share}%', // Second caption line, weeks behind and the share (English: 1,234 of 4,695 weeks · 26%)
    // «из» puts the whole group in the genitive, so the form does not follow the
    // count: «из 4 недель» and «из 4 695 недель» take the same word.
    weekCount: forms({ one: 'недель', few: 'недель', many: 'недель', other: 'недель' }), // Counted noun used in the line above (English: 4,695 weeks)
  },

  logos: {
    heading: 'Логотипы', // Heading above the two image pickers (English: Logos)
    vault: 'Логотип на панели', // Image shown instead of the vault name (English: Sidebar logo)
    vaultDesc: 'Показывается вместо имени хранилища. Одноцветные SVG принимают цвета темы.', // Says what happens to an SVG (English: Shown instead of the vault name. Single-color SVGs take on the theme's colors.)
    banner: 'Логотип на баннере', // Image shown over the navigation banner (English: Banner logo)
    bannerDesc: 'Показывается поверх баннера, заданного в Notebook Navigator.', // Names where the banner comes from (English: Shown over the banner image set in Notebook Navigator.)
    choose: 'Выберите изображение', // Placeholder in both pickers (English: Choose an image)
  },
};
