/* Runtime stand-in for the `obsidian` module, wired in by vitest.config.ts.
   Types still come from the real package. Extend it as tests need a symbol. */

/** Tests read English; the locale files are compared by scripts/check-strings.mjs. */
export function getLanguage(): string {
  return 'en';
}

interface ElementOptions {
  cls?: string;
  text?: string;
  type?: string;
  attr?: Record<string, string>;
}

function build(doc: Document, tag: string, options: ElementOptions = {}): HTMLElement {
  const element = doc.createElement(tag);
  if (options.cls !== undefined) element.className = options.cls;
  if (options.text !== undefined) element.textContent = options.text;
  if (options.type !== undefined) element.setAttribute('type', options.type);
  for (const [name, value] of Object.entries(options.attr ?? {})) element.setAttribute(name, value);
  return element;
}

/* Obsidian adds these to HTMLElement itself, so code written against the app
   calls them without importing anything. */
const helpers = {
  createEl(this: HTMLElement, tag: string, options: ElementOptions = {}): HTMLElement {
    const child = build(this.ownerDocument, tag, options);
    this.appendChild(child);
    return child;
  },

  createDiv(this: HTMLElement, options: ElementOptions = {}): HTMLElement {
    return helpers.createEl.call(this, 'div', options);
  },

  addClass(this: HTMLElement, ...names: string[]): void {
    this.classList.add(...names);
  },

  removeClass(this: HTMLElement, ...names: string[]): void {
    this.classList.remove(...names);
  },

  toggleClass(this: HTMLElement, name: string, on: boolean): void {
    this.classList.toggle(name, on);
  },

  detach(this: HTMLElement): void {
    this.remove();
  },

  setCssProps(this: HTMLElement, props: Record<string, string>): void {
    for (const [name, value] of Object.entries(props)) this.style.setProperty(name, value);
  },
};

Object.assign(HTMLElement.prototype, helpers);

/* The document-level constructors, which Obsidian exposes as bare globals. */
Object.assign(window, {
  createEl: (tag: string, options?: ElementOptions) => build(document, tag, options),
  createDiv: (options?: ElementOptions) => build(document, 'div', options),
  createFragment: () => document.createDocumentFragment(),
});

export abstract class TAbstractFile {
  constructor(public path: string) {}
}

export class TFile extends TAbstractFile {
  get extension(): string {
    const dot = this.path.lastIndexOf('.');
    return dot < 0 ? '' : this.path.slice(dot + 1);
  }
}

export class TFolder extends TAbstractFile {}

export class Vault {
  readonly files = new Map<string, TAbstractFile>();
  /** Set by a test to make `getResourcePath` throw, the way a gone file does. */
  unreadable = new Set<string>();

  add(file: TAbstractFile): TAbstractFile {
    this.files.set(file.path, file);
    return file;
  }

  getAbstractFileByPath(path: string): TAbstractFile | null {
    return this.files.get(path) ?? null;
  }

  getResourcePath(file: TAbstractFile): string {
    if (this.unreadable.has(file.path)) throw new Error(`cannot serve ${file.path}`);
    return `app://abcdef/${file.path}`;
  }
}

type Handler = (...args: unknown[]) => void;

export class Workspace {
  private readonly handlers = new Map<string, Set<Handler>>();
  private ready: (() => void)[] | null = [];

  on(name: string, handler: Handler): { name: string; handler: Handler } {
    const set = this.handlers.get(name) ?? new Set();
    set.add(handler);
    this.handlers.set(name, set);
    return { name, handler };
  }

  offref(ref: { name: string; handler: Handler }): void {
    this.handlers.get(ref.name)?.delete(ref.handler);
  }

  trigger(name: string, ...args: unknown[]): void {
    for (const handler of this.handlers.get(name) ?? []) handler(...args);
  }

  onLayoutReady(callback: () => void): void {
    if (this.ready === null) callback();
    else this.ready.push(callback);
  }

  /** Runs what the plugin deferred until the workspace existed. */
  layoutReady(): void {
    const pending = this.ready ?? [];
    this.ready = null;
    for (const callback of pending) callback();
  }
}

export class App {
  readonly vault = new Vault();
  readonly workspace = new Workspace();
}

export interface Command {
  id: string;
  name: string;
  callback?: () => unknown;
}

export class Notice {
  static readonly shown: string[] = [];
  constructor(readonly message: string) {
    Notice.shown.push(message);
  }
}

export class Component {
  private readonly cleanups: (() => void)[] = [];

  register(cleanup: () => void): void {
    this.cleanups.push(cleanup);
  }

  unload(): void {
    for (const cleanup of this.cleanups.splice(0)) cleanup();
  }
}

/**
 * What the stub adds to a plugin so a test can see what it did. The real type
 * has none of it, so a test names both.
 */
export interface Instrumented {
  readonly commands: Command[];
  readonly tabs: { updates: number }[];
  stored: unknown;
  unload(): void;
}

export class Plugin extends Component {
  settings?: unknown;
  readonly commands: Command[] = [];
  readonly tabs: PluginSettingTab[] = [];
  /** Whatever `saveData` last wrote, which is this vault's data.json. */
  stored: unknown = null;

  constructor(
    readonly app: App,
    readonly manifest: { id: string; version: string } = { id: 'test', version: '0.0.0' },
  ) {
    super();
  }

  addCommand(command: Command): Command {
    this.commands.push(command);
    return command;
  }

  addSettingTab(tab: PluginSettingTab): void {
    this.tabs.push(tab);
  }

  registerEvent(ref: { name: string; handler: Handler }): void {
    this.register(() => this.app.workspace.offref(ref));
  }

  registerDomEvent(target: EventTarget, type: string, handler: EventListener): void {
    target.addEventListener(type, handler);
    this.register(() => target.removeEventListener(type, handler));
  }

  async loadData(): Promise<unknown> {
    return this.stored;
  }

  async saveData(data: unknown): Promise<void> {
    /* Round-tripped through JSON, so a test sees what the disk would hold. */
    this.stored = JSON.parse(JSON.stringify(data));
  }
}

class ButtonComponent {
  constructor(readonly buttonEl: HTMLElement) {}

  setButtonText(text: string): this {
    this.buttonEl.textContent = text;
    return this;
  }

  onClick(listener: () => void): this {
    this.buttonEl.addEventListener('click', listener);
    return this;
  }
}

/** The three columns the real one has: info holds the name and the description,
 *  control holds the rest. */
export class Setting {
  readonly settingEl: HTMLElement;
  readonly controlEl: HTMLElement;

  constructor(container: HTMLElement) {
    this.settingEl = container.createDiv({ cls: 'setting-item' });
    this.controlEl = this.settingEl.createDiv({ cls: 'setting-item-control' });
  }

  addButton(build: (button: ButtonComponent) => void): this {
    const element = this.controlEl.createEl('button');
    build(new ButtonComponent(element));
    return this;
  }
}

export class PluginSettingTab {
  /** Counts the redraws the screen asks for, which is what a test can observe. */
  updates = 0;

  constructor(
    readonly app: App,
    readonly plugin: Plugin,
  ) {}

  getControlValue(_key: string): unknown {
    return undefined;
  }

  setControlValue(_key: string, _value: unknown): void | Promise<void> {}

  getSettingDefinitions(): unknown[] {
    return [];
  }

  update(): void {
    this.updates++;
  }
}
