/*
 * Skywalker Settings - Plugin for Obsidian
 * Copyright (c) 2026 theLOOP
 * SPDX-License-Identifier: MIT
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SkywalkerSettingsPlugin from '../src/main';
import { App, type Instrumented, Notice, TFile } from './stubs/obsidian';
import { strings } from '../src/i18n/index';
import { DEFAULT_SETTINGS } from '../src/settings';
import { setRect, setWindowWidth } from './setup';

const SETTLE = 120;

type Loaded = SkywalkerSettingsPlugin & Instrumented;

function plugin(stored: unknown = null) {
  const app = new App();
  const made = new SkywalkerSettingsPlugin(app as never, {
    id: 'skywalker-settings',
    version: '0.1.0',
  } as never) as Loaded;
  made.stored = stored;
  return { app, plugin: made };
}

async function loaded(stored: unknown = null) {
  const { app, plugin: made } = plugin(stored);
  await made.onload();
  app.workspace.layoutReady();
  return { app, plugin: made };
}

function command(made: Loaded, id: string) {
  const found = made.commands.find((entry) => entry.id === id);
  if (found === undefined) throw new Error(`no command ${id}`);
  return found;
}

function canvases(): number {
  return document.querySelectorAll('.loopsk-starfield').length;
}

beforeEach(() => {
  vi.useFakeTimers();
  setWindowWidth(1000);
  setRect(document.body, 1000, 2000);
  Notice.shown.length = 0;
});

afterEach(() => {
  document.body.replaceChildren();
  document.body.removeAttribute('style');
  vi.useRealTimers();
});

describe('loading', () => {
  it('starts on the defaults when the vault holds no settings', async () => {
    const { plugin: made } = await loaded();
    expect(made.settings).toEqual(DEFAULT_SETTINGS);
    made.onunload();
  });

  it('reads what was stored', async () => {
    const { plugin: made } = await loaded({ starHeight: 88, starfieldEnabled: true });
    expect(made.settings.starHeight).toBe(88);
    made.onunload();
  });

  it('mends a stored file that has drifted out of range', async () => {
    const { plugin: made } = await loaded({ starHeight: 9000, lifeGridLayout: 'spiral' });
    expect(made.settings.starHeight).toBe(200);
    expect(made.settings.lifeGridLayout).toBe(DEFAULT_SETTINGS.lifeGridLayout);
    made.onunload();
  });

  it('registers its screen and its three commands', async () => {
    const { plugin: made } = await loaded();
    expect(made.tabs).toHaveLength(1);
    expect(made.commands.map((entry) => entry.id).sort()).toEqual([
      'cycle-life-calendar-layout',
      'rearrange-starfield',
      'toggle-starfield',
    ]);
    made.onunload();
  });

  it('draws nothing before the workspace is ready', async () => {
    const { plugin: made } = plugin({ starfieldEnabled: true });
    await made.onload();
    expect(canvases()).toBe(0);
    made.onunload();
  });

  it('draws once the workspace is ready', async () => {
    const { plugin: made } = await loaded({ starfieldEnabled: true });
    expect(canvases()).toBe(1);
    made.onunload();
  });

  it('hands a stored image to the theme on the way up', async () => {
    const { app, plugin: made } = plugin({ vaultLogoPath: 'art/mark.svg' });
    app.vault.add(new TFile('art/mark.svg'));
    await made.onload();
    app.workspace.layoutReady();

    expect(document.body.style.getPropertyValue('--loopsk-vault-logo')).toContain('art/mark.svg');
    made.onunload();
  });
});

describe('following the workspace', () => {
  function bandWidth(): number {
    return document.querySelector<HTMLCanvasElement>('.loopsk-starfield')?.width ?? 0;
  }

  it.each(['layout-change', 'active-leaf-change', 'resize'])(
    'remeasures after %s settles',
    async (event) => {
      const { app, plugin: made } = await loaded({ starfieldEnabled: true });
      expect(bandWidth()).toBe(1000);

      setWindowWidth(1400);
      app.workspace.trigger(event);
      vi.advanceTimersByTime(SETTLE);

      expect(bandWidth()).toBe(1400);
      made.onunload();
    },
  );

  it('waits for the layout to hold still before it does anything', async () => {
    const { app, plugin: made } = await loaded({ starfieldEnabled: true });

    setWindowWidth(1400);
    app.workspace.trigger('resize');
    vi.advanceTimersByTime(SETTLE - 1);

    expect(bandWidth()).toBe(1000);
    made.onunload();
  });

  it('remeasures once for a burst of events rather than once each', async () => {
    const { app, plugin: made } = await loaded({ starfieldEnabled: true });
    const canvas = document.querySelector('.loopsk-starfield');

    setWindowWidth(1400);
    for (let i = 0; i < 20; i++) app.workspace.trigger('resize');
    vi.advanceTimersByTime(SETTLE);

    /* The same canvas, remeasured: a pane that only changed size keeps its sky. */
    expect(document.querySelector('.loopsk-starfield')).toBe(canvas);
    expect(bandWidth()).toBe(1400);
    made.onunload();
  });

  it('builds the sky again once a pane it drew into has gone', async () => {
    const { app, plugin: made } = await loaded({
      starfieldEnabled: true,
      starRegionTop: false,
      starRegionLeft: true,
    });
    const sidebar = document.body.createDiv({ cls: 'workspace-split mod-left-split' });
    setRect(sidebar, 300, 800);

    app.workspace.trigger('layout-change');
    vi.advanceTimersByTime(SETTLE);
    expect(canvases()).toBe(1);

    sidebar.remove();
    app.workspace.trigger('layout-change');
    vi.advanceTimersByTime(SETTLE);

    expect(canvases()).toBe(0);
    made.onunload();
  });

  it('leaves the images alone while the panes move', async () => {
    const { app, plugin: made } = plugin({ vaultLogoPath: 'art/mark.svg' });
    app.vault.add(new TFile('art/mark.svg'));
    await made.onload();
    app.workspace.layoutReady();

    const resolve = vi.spyOn(app.vault, 'getResourcePath');
    app.workspace.trigger('resize');
    vi.advanceTimersByTime(SETTLE);

    expect(resolve).not.toHaveBeenCalled();
    made.onunload();
  });

  it('picks the loop back up when the window is shown again', async () => {
    const { plugin: made } = await loaded({ starfieldEnabled: true });
    expect(() => document.dispatchEvent(new Event('visibilitychange'))).not.toThrow();
    made.onunload();
  });
});

describe('the commands', () => {
  it('switches the starfield on and off', async () => {
    const { plugin: made } = await loaded();
    const toggle = command(made, 'toggle-starfield');

    await toggle.callback?.();
    expect(made.settings.starfieldEnabled).toBe(true);
    expect(canvases()).toBe(1);

    await toggle.callback?.();
    expect(made.settings.starfieldEnabled).toBe(false);
    expect(canvases()).toBe(0);
    made.onunload();
  });

  it('writes the switch to disk, so it survives a reload', async () => {
    const { plugin: made } = await loaded();
    await command(made, 'toggle-starfield').callback?.();
    expect(made.stored).toMatchObject({ starfieldEnabled: true });
    made.onunload();
  });

  it('scatters the stars without changing a setting', async () => {
    const { plugin: made } = await loaded({ starfieldEnabled: true });
    const before = { ...made.settings };

    await command(made, 'rearrange-starfield').callback?.();

    expect(made.settings).toEqual(before);
    expect(canvases()).toBe(1);
    made.onunload();
  });

  it('steps the calendar through its layouts and back round', async () => {
    const { plugin: made } = await loaded();
    const next = command(made, 'cycle-life-calendar-layout');

    await next.callback?.();
    expect(made.settings.lifeGridLayout).toBe('ribbon');
    await next.callback?.();
    expect(made.settings.lifeGridLayout).toBe('ageyear');
    made.onunload();
  });

  it('says which layout it landed on', async () => {
    const { plugin: made } = await loaded();
    await command(made, 'cycle-life-calendar-layout').callback?.();
    expect(Notice.shown).toEqual([
      strings.commands.layoutNow.replace('{layout}', strings.lifegrid.layoutRibbon),
    ]);
    made.onunload();
  });

  it('redraws the screen, since the layout row now reads differently', async () => {
    const { plugin: made } = await loaded();
    await command(made, 'cycle-life-calendar-layout').callback?.();
    expect(made.tabs[0]?.updates).toBe(1);
    made.onunload();
  });
});

describe('unloading', () => {
  it('takes the sky, the calendar and the images with it', async () => {
    const { app, plugin: made } = plugin({ starfieldEnabled: true, vaultLogoPath: 'art/mark.svg' });
    app.vault.add(new TFile('art/mark.svg'));
    await made.onload();
    app.workspace.layoutReady();

    made.onunload();

    expect(canvases()).toBe(0);
    expect(document.body.style.getPropertyValue('--loopsk-vault-logo')).toBe('');
  });

  it('draws nothing more after a pending redraw was cancelled', async () => {
    const { app, plugin: made } = await loaded({ starfieldEnabled: true });

    app.workspace.trigger('resize');
    made.onunload();
    made.unload();
    vi.advanceTimersByTime(SETTLE);

    expect(canvases()).toBe(0);
  });

  it('stops following the workspace', async () => {
    const { app, plugin: made } = await loaded({ starfieldEnabled: true });

    made.onunload();
    made.unload();
    app.workspace.trigger('resize');
    vi.advanceTimersByTime(SETTLE);

    expect(canvases()).toBe(0);
  });
});
