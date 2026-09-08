import { App, Plugin, PluginSettingTab, Setting, SettingDefinitionItem, TFile } from 'obsidian';
import { SkywalkerSettings, DEFAULT_SETTINGS } from './settings';
import { renderStarfield, removeStarfield } from './utils/starfield';
import { applyAssets, clearAssets, IMAGE_EXTENSIONS } from './utils/assets';
import { PRESETS, CUSTOM_PRESET, presetOptions, findPreset, matchesPreset, PresetValues } from './presets';

const COMPANION_CLASS = 'loop-skywalker-companion';
const SETTLE_MS = 120;

export default class SkywalkerSettingsPlugin extends Plugin {
  settings: SkywalkerSettings;
  tab: SkywalkerSettingTab;
  private settleTimer: number | null = null;

  async onload() {
    await this.loadSettings();

    // Lets the theme stand down where this plugin does the same job better, so
    // the two never draw the same thing twice.
    document.body.addClass(COMPANION_CLASS);

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
    });
    this.register(() => this.cancel());

    this.tab = new SkywalkerSettingTab(this.app, this);
    this.addSettingTab(this.tab);

    this.addCommand({
      id: 'toggle-starfield',
      name: 'Toggle starfield',
      callback: async () => {
        this.settings.starfieldEnabled = !this.settings.starfieldEnabled;
        await this.saveSettings();
      },
    });

    this.addCommand({
      id: 'rearrange-starfield',
      name: 'Rearrange starfield',
      callback: () => renderStarfield(this.settings),
    });
  }

  /** Dragging a divider fires continuously, and rebuilding hundreds of elements
   *  on each of those is pointless. Wait for it to settle. */
  private schedule(): void {
    this.cancel();
    this.settleTimer = window.setTimeout(() => {
      this.settleTimer = null;
      this.refresh();
    }, SETTLE_MS);
  }

  private cancel(): void {
    if (this.settleTimer !== null) {
      window.clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
  }

  onunload() {
    this.cancel();
    removeStarfield();
    clearAssets();
    document.body.removeClass(COMPANION_CLASS);
  }

  refresh() {
    renderStarfield(this.settings);
    applyAssets(this.app, this.settings);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.refresh();
  }
}

const isImage = (file: TFile) => IMAGE_EXTENSIONS.includes(file.extension.toLowerCase());
const percent = (value: number) => `${value}%`;
const pixels = (value: number) => `${value}px`;

/** Sliders a preset owns. Moving one of these drops the preset to Custom. */
const PRESET_KEYS: (keyof PresetValues)[] = [
  'starCount',
  'starScale',
  'starBlinkShare',
  'starSpeed',
  'starBrightness',
  'starWarmShare',
];

class SkywalkerSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: SkywalkerSettingsPlugin) {
    super(app, plugin);
  }

  getControlValue(key: string): unknown {
    return this.plugin.settings[key as keyof SkywalkerSettings];
  }

  /**
   * The base class persists the value and stops there, which would leave the
   * sky on screen showing the previous settings. Redrawing has to happen here.
   */
  async setControlValue(key: string, value: unknown): Promise<void> {
    const settings = this.plugin.settings as unknown as Record<string, unknown>;
    settings[key] = value;

    if (key === 'starPreset') {
      const preset = findPreset(String(value));
      if (preset) Object.assign(this.plugin.settings, preset.values);
    } else if (PRESET_KEYS.includes(key as keyof PresetValues)) {
      // A preset is a claim about what is on screen. Once a slider it owns
      // moves, the claim is false, so stop making it.
      if (!matchesPreset(this.plugin.settings, this.plugin.settings.starPreset)) {
        this.plugin.settings.starPreset = CUSTOM_PRESET;
      }
    }

    await this.plugin.saveSettings();
    this.update();
  }

  private custom = () => this.plugin.settings.starPreset === CUSTOM_PRESET;

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        type: 'group',
        heading: 'Starfield',
        items: [
          {
            name: 'Starfield',
            desc: 'Stars across the top of the window. Dark mode only.',
            control: { type: 'toggle', key: 'starfieldEnabled' },
          },
          {
            name: 'Style',
            desc: 'Presets set the sky, the twinkle and the warmth. Moving any of those yourself switches this to Custom.',
            control: {
              type: 'dropdown',
              key: 'starPreset',
              options: presetOptions,
              defaultValue: DEFAULT_SETTINGS.starPreset,
            },
          },
          {
            name: 'Top of the window',
            control: { type: 'toggle', key: 'starRegionTop' },
          },
          {
            name: 'Left sidebar',
            control: { type: 'toggle', key: 'starRegionLeft' },
          },
          {
            name: 'Right sidebar',
            control: { type: 'toggle', key: 'starRegionRight' },
          },
          {
            name: 'Sidebar brightness',
            desc: 'Sidebars are dimmed against the top, so they stay in the background.',
            visible: () => this.plugin.settings.starRegionLeft || this.plugin.settings.starRegionRight,
            control: {
              type: 'slider',
              key: 'starEdgeBrightness',
              min: 5,
              max: 100,
              step: 5,
              displayFormat: percent,
            },
          },
          {
            name: 'Parallax',
            desc: 'Nearer stars drift further than distant ones. Very slow, and off by default.',
            control: {
              type: 'slider',
              key: 'starDrift',
              min: 0,
              max: 30,
              step: 1,
              displayFormat: (value: number) => (value === 0 ? 'Off' : `${value}px`),
            },
          },
          {
            name: 'Height',
            desc: 'How far down from the top the stars reach. Sidebars fill their own height.',
            control: {
              type: 'slider',
              key: 'starHeight',
              min: 24,
              max: 200,
              step: 2,
              displayFormat: pixels,
            },
          },
          {
            name: 'Show on empty tabs',
            desc: 'Obsidian\u2019s New tab pane, where there is nothing to read.',
            control: { type: 'toggle', key: 'starRegionEmptyTab' },
          },
          {
            name: 'Most stars in one area',
            desc: 'A ceiling, so a large display does not end up with thousands of them. Raise it if the panes look sparser than the top bar.',
            control: {
              type: 'slider',
              key: 'starMax',
              min: 100,
              max: 4000,
              step: 100,
            },
          },
          {
            name: 'Rearrange stars',
            desc: 'Scatter them into a new arrangement.',
            render: (setting: Setting) => {
              setting.addButton((button) =>
                button.setButtonText('Rearrange').onClick(() => renderStarfield(this.plugin.settings))
              );
            },
          },
        ],
      },
      {
        type: 'group',
        heading: 'Sky',
        visible: this.custom,
        items: [
          {
            name: 'Stars',
            desc: 'How many stars in the sky.',
            control: { type: 'slider', key: 'starCount', min: 10, max: 600, step: 10 },
          },
          {
            name: 'Size',
            desc: 'Scales every star. Larger stars glow, smaller ones do not.',
            control: {
              type: 'slider',
              key: 'starScale',
              min: 40,
              max: 300,
              step: 10,
              displayFormat: percent,
            },
          },
          {
            name: 'Brightness',
            control: {
              type: 'slider',
              key: 'starBrightness',
              min: 10,
              max: 100,
              step: 5,
              displayFormat: percent,
            },
          },
        ],
      },
      {
        type: 'group',
        heading: 'Twinkle',
        visible: this.custom,
        items: [
          {
            name: 'Stars that twinkle',
            desc: 'The rest stay lit.',
            control: {
              type: 'slider',
              key: 'starBlinkShare',
              min: 0,
              max: 100,
              step: 5,
              displayFormat: percent,
            },
          },
          {
            name: 'Twinkle speed',
            control: {
              type: 'slider',
              key: 'starSpeed',
              min: 25,
              max: 300,
              step: 5,
              displayFormat: percent,
            },
          },
        ],
      },
      {
        type: 'group',
        heading: 'Star color',
        items: [
          {
            name: 'Stars',
            control: { type: 'color', key: 'starColor' },
          },
          {
            name: 'Warm stars',
            desc: 'A second color, for variation.',
            control: { type: 'color', key: 'starWarmColor' },
          },
          {
            name: 'How many are warm',
            visible: this.custom,
            control: {
              type: 'slider',
              key: 'starWarmShare',
              min: 0,
              max: 100,
              step: 5,
              displayFormat: percent,
            },
          },
        ],
      },
      {
        type: 'group',
        heading: 'Logos',
        items: [
          {
            name: 'Sidebar logo',
            desc: 'Shown instead of the vault name. Single-color SVGs take on the theme’s colors.',
            control: {
              type: 'file',
              key: 'vaultLogoPath',
              placeholder: 'Choose an image',
              filter: isImage,
            },
          },
          {
            name: 'Banner logo',
            desc: 'Shown over the banner image set in Notebook Navigator.',
            control: {
              type: 'file',
              key: 'bannerLogoPath',
              placeholder: 'Choose an image',
              filter: isImage,
            },
          },
        ],
      },
    ];
  }
}

// Keeps the preset list honest: every preset must set every key a preset owns.
PRESETS.forEach((preset) => {
  for (const key of PRESET_KEYS) {
    if (preset.values[key] === undefined) {
      throw new Error(`Preset ${preset.id} is missing ${key}`);
    }
  }
});
