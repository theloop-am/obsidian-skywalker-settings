import { App, Plugin, PluginSettingTab, Setting, FuzzySuggestModal, TFile } from 'obsidian';
import { SkywalkerSettings, DEFAULT_SETTINGS } from './settings';
import { renderStarfield, removeStarfield } from './utils/starfield';
import { applyAssets, clearAssets, imageFiles } from './utils/assets';

const COMPANION_CLASS = 'loop-skywalker-companion';

export default class SkywalkerSettingsPlugin extends Plugin {
  settings: SkywalkerSettings;

  async onload() {
    await this.loadSettings();

    // The theme looks for this to stand down where the plugin does the job
    // better, so the two never draw the same thing twice.
    document.body.addClass(COMPANION_CLASS);

    this.app.workspace.onLayoutReady(() => this.refresh());

    this.addSettingTab(new SkywalkerSettingTab(this.app, this));

    this.addCommand({
      id: 'toggle-starfield',
      name: 'Toggle starfield',
      callback: async () => {
        this.settings.starfieldEnabled = !this.settings.starfieldEnabled;
        await this.saveSettings();
      },
    });

    this.addCommand({
      id: 'reseed-starfield',
      name: 'Reseed starfield',
      callback: () => renderStarfield(this.settings),
    });
  }

  onunload() {
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

/** Picks an image out of the vault, so nobody has to type a path. */
class ImageSuggestModal extends FuzzySuggestModal<TFile> {
  constructor(app: App, private onPick: (file: TFile | null) => void) {
    super(app);
    this.setPlaceholder('Pick an image, or press Escape to clear');
  }

  getItems(): TFile[] {
    return imageFiles(this.app);
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onPick(file);
  }
}

class SkywalkerSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: SkywalkerSettingsPlugin) {
    super(app, plugin);
  }

  private slider(
    name: string,
    desc: string,
    key: 'starCount' | 'starHeight' | 'starScale' | 'starSpeed' | 'starBlinkShare' | 'starBrightness' | 'starWarmShare',
    min: number,
    max: number,
    step: number
  ) {
    new Setting(this.containerEl)
      .setName(name)
      .setDesc(desc)
      .addSlider((s) =>
        s
          .setLimits(min, max, step)
          .setValue(this.plugin.settings[key])
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings[key] = value;
            await this.plugin.saveSettings();
          })
      );
  }

  private colour(name: string, key: 'starColor' | 'starWarmColor') {
    new Setting(this.containerEl).setName(name).addColorPicker((c) =>
      c.setValue(this.plugin.settings[key]).onChange(async (value) => {
        this.plugin.settings[key] = value;
        await this.plugin.saveSettings();
      })
    );
  }

  private imagePicker(
    name: string,
    desc: string,
    key: 'vaultLogoPath' | 'bannerLogoPath',
    cssVar: string
  ) {
    const current = this.plugin.settings[key];
    new Setting(this.containerEl)
      .setName(name)
      .setDesc(`${desc} Exposed to the theme as ${cssVar}.${current ? ` Currently: ${current}` : ''}`)
      .addButton((b) =>
        b.setButtonText(current ? 'Change' : 'Choose image').onClick(() => {
          new ImageSuggestModal(this.app, async (file) => {
            this.plugin.settings[key] = file ? file.path : '';
            await this.plugin.saveSettings();
            this.display();
          }).open();
        })
      )
      .addExtraButton((b) =>
        b
          .setIcon('x')
          .setTooltip('Clear')
          .setDisabled(!current)
          .onClick(async () => {
            this.plugin.settings[key] = '';
            await this.plugin.saveSettings();
            this.display();
          })
      );
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName('Starfield').setHeading();

    new Setting(containerEl)
      .setName('Enable starfield')
      .setDesc('Stars across the top bar, each fading on its own schedule. Dark mode only.')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.starfieldEnabled).onChange(async (value) => {
          this.plugin.settings.starfieldEnabled = value;
          await this.plugin.saveSettings();
        })
      );

    this.slider('How many stars', '', 'starCount', 10, 600, 10);
    this.slider('How deep the sky is', 'Height of the strip, in pixels.', 'starHeight', 24, 200, 2);
    this.slider('Star size', 'Scales every tier. Small stars stay bare points; only the large ones glow.', 'starScale', 40, 300, 10);
    this.slider('How many blink', 'Percent that pulse at all. The rest hold still, which is what makes it read as a sky.', 'starBlinkShare', 0, 100, 5);
    this.slider('Blink speed', 'Higher is faster. Small stars blink quickly, large ones slowly, either way.', 'starSpeed', 25, 300, 5);
    this.slider('Brightness', '', 'starBrightness', 10, 100, 5);
    this.slider('Share of warm stars', 'Percent drawn in the warm colour.', 'starWarmShare', 0, 100, 5);

    this.colour('Star colour', 'starColor');
    this.colour('Warm star colour', 'starWarmColor');

    new Setting(containerEl)
      .setName('Reseed')
      .setDesc('Lay the stars out again, at new random positions.')
      .addButton((b) => b.setButtonText('Reseed').onClick(() => renderStarfield(this.plugin.settings)));

    new Setting(containerEl).setName('Vault images').setHeading();

    new Setting(containerEl).setDesc(
      'A theme cannot turn a vault path into a usable URL, so it cannot use your own artwork. This plugin resolves the file and hands the theme a CSS variable, which the theme then masks and recolours per theme. Single-colour SVGs work best.'
    );

    this.imagePicker(
      'Logo in place of the vault name',
      'Replaces the vault name at the bottom of the sidebar.',
      'vaultLogoPath',
      '--loop-vault-logo'
    );

    this.imagePicker(
      'Logo over the navigation banner',
      'Drawn over the banner image set in Notebook Navigator.',
      'bannerLogoPath',
      '--loop-banner-logo'
    );
  }
}
