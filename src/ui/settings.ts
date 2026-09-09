/*
 * Skywalker Settings - Plugin for Obsidian
 * Copyright (c) 2026 theLOOP
 * SPDX-License-Identifier: MIT
 */

import {
  type App,
  type Plugin,
  PluginSettingTab,
  type Setting,
  type SettingDefinitionItem,
} from 'obsidian';
import { isImage } from '../assets';
import { strings } from '../i18n/index';
import { count } from '../i18n/plural';
import { CUSTOM_PRESET, findPreset, matchesPreset, PRESET_KEYS, presetOptions } from '../presets';
import { DEFAULT_SETTINGS, RANGES, type SkywalkerSettings } from '../settings';
import { renderStarfield } from '../starfield';
import { layoutOptions, percent, pixels, tintOptions } from './labels';

/** What this screen needs from the plugin that owns it. */
export interface SettingsHost extends Plugin {
  settings: SkywalkerSettings;
  saveSettings(): Promise<void>;
}

/** Today as YYYY-MM-DD, in local time, for the date input's `max`. */
export function todayISO(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export class SkywalkerSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly host: SettingsHost,
  ) {
    super(app, host);
  }

  override getControlValue(key: string): unknown {
    return this.host.settings[key as keyof SkywalkerSettings];
  }

  /**
   * The base class persists the value and stops there, which would leave the sky
   * on screen showing the previous settings. Redrawing has to happen here.
   */
  override async setControlValue(key: string, value: unknown): Promise<void> {
    if (!(key in DEFAULT_SETTINGS)) return;
    Object.assign(this.host.settings, { [key]: value });

    if (key === 'starPreset') {
      const preset = findPreset(String(value));
      if (preset !== undefined) Object.assign(this.host.settings, preset.values);
    } else if ((PRESET_KEYS as string[]).includes(key)) {
      /* A preset is a claim about what is on screen. Once a slider it owns
         moves, the claim is false, so stop making it. */
      if (!matchesPreset(this.host.settings, this.host.settings.starPreset)) {
        this.host.settings.starPreset = CUSTOM_PRESET;
      }
    }

    await this.host.saveSettings();
    this.update();
  }

  private readonly custom = (): boolean => this.host.settings.starPreset === CUSTOM_PRESET;

  /** Every region except the top strip is dimmed, so the slider belongs to all
   *  of them rather than to the sidebars it was first written for. */
  private readonly dimmed = (): boolean =>
    this.host.settings.starRegionLeft ||
    this.host.settings.starRegionRight ||
    this.host.settings.starRegionEmptyTab ||
    this.host.settings.starRegionGraph;

  private readonly dated = (): boolean =>
    this.host.settings.lifeGridEnabled && this.host.settings.lifeGridBirthDate !== '';

  /** A native date input: Obsidian has no date control of its own. */
  private birthDate(setting: Setting): void {
    const input = setting.controlEl.createEl('input', {
      type: 'date',
      cls: 'loopsk-lifegrid-date',
    });
    input.value = this.host.settings.lifeGridBirthDate;
    input.max = todayISO();

    input.addEventListener('change', () => void this.pickBirthDate(input.value));
  }

  private async pickBirthDate(value: string): Promise<void> {
    const wasDated = this.dated();
    this.host.settings.lifeGridBirthDate = value;
    await this.host.saveSettings();
    /* The rows below appear only once a date is set. */
    if (wasDated !== this.dated()) this.update();
  }

  override getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        type: 'group',
        heading: strings.starfield.heading,
        items: [
          {
            name: strings.starfield.enabled,
            desc: strings.starfield.enabledDesc,
            control: { type: 'toggle', key: 'starfieldEnabled' },
          },
          {
            name: strings.starfield.style,
            desc: strings.starfield.styleDesc,
            control: {
              type: 'dropdown',
              key: 'starPreset',
              options: presetOptions,
              defaultValue: DEFAULT_SETTINGS.starPreset,
            },
          },
          {
            name: strings.starfield.regionTop,
            control: { type: 'toggle', key: 'starRegionTop' },
          },
          {
            name: strings.starfield.regionLeft,
            control: { type: 'toggle', key: 'starRegionLeft' },
          },
          {
            name: strings.starfield.regionRight,
            control: { type: 'toggle', key: 'starRegionRight' },
          },
          {
            name: strings.starfield.edgeBrightness,
            desc: strings.starfield.edgeBrightnessDesc,
            visible: this.dimmed,
            control: {
              type: 'slider',
              key: 'starEdgeBrightness',
              ...RANGES.starEdgeBrightness,
              displayFormat: percent,
            },
          },
          {
            name: strings.starfield.drift,
            desc: strings.starfield.driftDesc,
            control: {
              type: 'slider',
              key: 'starDrift',
              ...RANGES.starDrift,
              displayFormat: (value: number) =>
                value === 0 ? strings.starfield.driftOff : pixels(value),
            },
          },
          {
            name: strings.starfield.height,
            desc: strings.starfield.heightDesc,
            control: {
              type: 'slider',
              key: 'starHeight',
              ...RANGES.starHeight,
              displayFormat: pixels,
            },
          },
          {
            name: strings.starfield.emptyTab,
            desc: strings.starfield.emptyTabDesc,
            control: { type: 'toggle', key: 'starRegionEmptyTab' },
          },
          {
            name: strings.starfield.graph,
            desc: strings.starfield.graphDesc,
            control: { type: 'toggle', key: 'starRegionGraph' },
          },
          {
            name: strings.starfield.max,
            desc: strings.starfield.maxDesc,
            control: { type: 'slider', key: 'starMax', ...RANGES.starMax },
          },
          {
            name: strings.starfield.rearrange,
            desc: strings.starfield.rearrangeDesc,
            render: (setting: Setting) => {
              setting.addButton((button) =>
                button
                  .setButtonText(strings.starfield.rearrangeAction)
                  .onClick(() => renderStarfield(this.host.settings)),
              );
            },
          },
        ],
      },
      {
        type: 'group',
        heading: strings.sky.heading,
        visible: this.custom,
        items: [
          {
            name: strings.sky.count,
            desc: strings.sky.countDesc,
            control: { type: 'slider', key: 'starCount', ...RANGES.starCount },
          },
          {
            name: strings.sky.size,
            desc: strings.sky.sizeDesc,
            control: {
              type: 'slider',
              key: 'starScale',
              ...RANGES.starScale,
              displayFormat: percent,
            },
          },
          {
            name: strings.sky.brightness,
            control: {
              type: 'slider',
              key: 'starBrightness',
              ...RANGES.starBrightness,
              displayFormat: percent,
            },
          },
        ],
      },
      {
        type: 'group',
        heading: strings.twinkle.heading,
        visible: this.custom,
        items: [
          {
            name: strings.twinkle.share,
            desc: strings.twinkle.shareDesc,
            control: {
              type: 'slider',
              key: 'starBlinkShare',
              ...RANGES.starBlinkShare,
              displayFormat: percent,
            },
          },
          {
            name: strings.twinkle.speed,
            control: {
              type: 'slider',
              key: 'starSpeed',
              ...RANGES.starSpeed,
              displayFormat: percent,
            },
          },
        ],
      },
      {
        type: 'group',
        heading: strings.colour.heading,
        items: [
          {
            name: strings.colour.base,
            control: { type: 'color', key: 'starColor' },
          },
          {
            name: strings.colour.warm,
            desc: strings.colour.warmDesc,
            control: { type: 'color', key: 'starWarmColor' },
          },
          {
            name: strings.colour.warmShare,
            visible: this.custom,
            control: {
              type: 'slider',
              key: 'starWarmShare',
              ...RANGES.starWarmShare,
              displayFormat: percent,
            },
          },
        ],
      },
      {
        type: 'group',
        heading: strings.lifegrid.heading,
        items: [
          {
            name: strings.lifegrid.enabled,
            desc: strings.lifegrid.enabledDesc,
            control: { type: 'toggle', key: 'lifeGridEnabled' },
          },
          {
            name: strings.lifegrid.birth,
            desc: strings.lifegrid.birthDesc,
            visible: () => this.host.settings.lifeGridEnabled,
            render: (setting: Setting) => this.birthDate(setting),
          },
          {
            name: strings.lifegrid.years,
            desc: strings.lifegrid.yearsDesc,
            visible: this.dated,
            control: {
              type: 'slider',
              key: 'lifeGridYears',
              ...RANGES.lifeGridYears,
              displayFormat: (value: number) => count(value, strings.lifegrid.yearCount),
            },
          },
          {
            name: strings.lifegrid.layout,
            desc: strings.lifegrid.layoutDesc,
            visible: this.dated,
            control: {
              type: 'dropdown',
              key: 'lifeGridLayout',
              options: layoutOptions,
              defaultValue: DEFAULT_SETTINGS.lifeGridLayout,
            },
          },
          {
            name: strings.lifegrid.cell,
            desc: strings.lifegrid.cellDesc,
            visible: () => this.dated() && this.host.settings.lifeGridLayout === 'ribbon',
            control: {
              type: 'slider',
              key: 'lifeGridCellSize',
              ...RANGES.lifeGridCellSize,
              displayFormat: pixels,
            },
          },
          {
            name: strings.lifegrid.width,
            desc: strings.lifegrid.widthDesc,
            visible: this.dated,
            control: {
              type: 'slider',
              key: 'lifeGridWidth',
              ...RANGES.lifeGridWidth,
              displayFormat: percent,
            },
          },
          {
            name: strings.lifegrid.tint,
            desc: strings.lifegrid.tintDesc,
            visible: this.dated,
            control: {
              type: 'dropdown',
              key: 'lifeGridTintMode',
              options: tintOptions,
              defaultValue: DEFAULT_SETTINGS.lifeGridTintMode,
            },
          },
          {
            name: strings.lifegrid.custom,
            visible: () => this.dated() && this.host.settings.lifeGridTintMode === 'custom',
            control: { type: 'color', key: 'lifeGridTint' },
          },
          {
            name: strings.lifegrid.strength,
            desc: strings.lifegrid.strengthDesc,
            visible: this.dated,
            control: {
              type: 'slider',
              key: 'lifeGridStrength',
              ...RANGES.lifeGridStrength,
              displayFormat: percent,
            },
          },
          {
            name: strings.lifegrid.caption,
            desc: strings.lifegrid.captionDesc,
            visible: this.dated,
            control: { type: 'toggle', key: 'lifeGridCaption' },
          },
          {
            name: strings.lifegrid.captionStrength,
            desc: strings.lifegrid.captionStrengthDesc,
            visible: () => this.dated() && this.host.settings.lifeGridCaption,
            control: {
              type: 'slider',
              key: 'lifeGridTextStrength',
              ...RANGES.lifeGridTextStrength,
              displayFormat: percent,
            },
          },
          {
            name: strings.lifegrid.bare,
            desc: strings.lifegrid.bareDesc,
            visible: this.dated,
            control: { type: 'toggle', key: 'lifeGridBareTab' },
          },
        ],
      },
      {
        type: 'group',
        heading: strings.logos.heading,
        items: [
          {
            name: strings.logos.vault,
            desc: strings.logos.vaultDesc,
            control: {
              type: 'file',
              key: 'vaultLogoPath',
              placeholder: strings.logos.choose,
              filter: isImage,
            },
          },
          {
            name: strings.logos.banner,
            desc: strings.logos.bannerDesc,
            control: {
              type: 'file',
              key: 'bannerLogoPath',
              placeholder: strings.logos.choose,
              filter: isImage,
            },
          },
        ],
      },
    ];
  }
}
