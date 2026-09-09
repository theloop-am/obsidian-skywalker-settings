/*
 * Skywalker Settings - Plugin for Obsidian
 * Copyright (c) 2026 theLOOP
 * SPDX-License-Identifier: MIT
 */

import { Plugin } from 'obsidian';
import { applyAssets, clearAssets } from './assets';
import { strings } from './i18n/index';
import { removeLifeGrid, renderLifeGrid } from './lifegrid';
import { notify } from './logging';
import { PRESET_IDS } from './presets';
import { LAYOUTS, normalise, type SkywalkerSettings } from './settings';
import { removeStarfield, renderStarfield, syncStarfield, wakeStarfield } from './starfield';
import { layoutOptions } from './ui/labels';
import { SkywalkerSettingTab } from './ui/settings';

/** Dragging a divider fires continuously; rebuilding on each of those is
 *  pointless. This is how long the layout has to hold still first. */
const SETTLE_MS = 120;

export default class SkywalkerSettingsPlugin extends Plugin {
  /* Declared `unknown` upstream, so a plugin can name its own shape. */
  override settings: SkywalkerSettings = normalise({}, PRESET_IDS);
  private tab: SkywalkerSettingTab | null = null;
  private settleTimer: number | null = null;

  override async onload(): Promise<void> {
    await this.loadSettings();

    this.app.workspace.onLayoutReady(() => {
      this.refresh();
      // Panes open and close.
      this.registerEvent(this.app.workspace.on('layout-change', () => this.schedule()));
      // Empty tabs come and go as notes are opened and closed.
      this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.schedule()));
      // Dragging a divider changes no structure, so layout-change stays silent.
      // 'resize' is the one that fires, and without it the star count stays at
      // whatever the pane's area happened to be when it was last drawn.
      this.registerEvent(this.app.workspace.on('resize', () => this.schedule()));
      // The loop stops itself when the window is hidden; this starts it again.
      this.registerDomEvent(document, 'visibilitychange', () => {
        if (!document.hidden) wakeStarfield();
      });
    });
    this.register(() => this.cancel());

    this.tab = new SkywalkerSettingTab(this.app, this);
    this.addSettingTab(this.tab);

    this.addCommand({
      id: 'toggle-starfield',
      name: strings.commands.toggleStarfield,
      callback: async () => {
        this.settings.starfieldEnabled = !this.settings.starfieldEnabled;
        await this.saveSettings();
      },
    });

    this.addCommand({
      id: 'rearrange-starfield',
      name: strings.commands.rearrangeStarfield,
      callback: () => renderStarfield(this.settings),
    });

    this.addCommand({
      id: 'cycle-life-calendar-layout',
      name: strings.commands.nextLayout,
      callback: async () => {
        const next = LAYOUTS[(LAYOUTS.indexOf(this.settings.lifeGridLayout) + 1) % LAYOUTS.length];
        if (next === undefined) return;
        this.settings.lifeGridLayout = next;
        await this.saveSettings();
        this.tab?.update();
        notify(strings.commands.layoutNow.replace('{layout}', layoutOptions[next]));
      },
    });
  }

  override onunload(): void {
    this.cancel();
    removeStarfield();
    removeLifeGrid();
    clearAssets();
  }

  /** Everything the plugin draws, from the settings it holds. */
  refresh(): void {
    renderStarfield(this.settings);
    renderLifeGrid(this.settings);
    applyAssets(this.app, this.settings);
  }

  /**
   * The panes moved. The sky is brought into line with them rather than built
   * again, so a pane that only changed size keeps its stars. The images are left
   * alone - a resize cannot change which file a setting points at.
   */
  private reflow(): void {
    syncStarfield(this.settings);
    renderLifeGrid(this.settings);
  }

  private schedule(): void {
    this.cancel();
    this.settleTimer = window.setTimeout(() => {
      this.settleTimer = null;
      this.reflow();
    }, SETTLE_MS);
  }

  private cancel(): void {
    if (this.settleTimer !== null) {
      window.clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = normalise(await this.loadData(), PRESET_IDS);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.refresh();
  }
}
