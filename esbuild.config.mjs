import { execFile, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import esbuild from 'esbuild';

const production = process.argv[2] === 'production';

const PLUGIN_ID = 'skywalker-settings';
const INSTALLED = ['main.js', 'manifest.json', 'styles.css'];

/* The vault to develop against, named the way `mise run plugin:install` names
   it. Unset means build only, which is what a plain `npm run dev` should do. */
function pluginFolder() {
  const vault = process.env.VAULT;
  return vault ? path.join(vault, '.obsidian', 'plugins', PLUGIN_ID) : null;
}

/* The vault name is what the CLI addresses a window by, and it is the folder
   holding `.obsidian`. */
function vaultName(target) {
  const parts = target.split(path.sep).filter(Boolean);
  const index = parts.indexOf('.obsidian');
  return index > 0 ? parts[index - 1] : undefined;
}

/* esbuild bundles a half-saved file happily, by stripping the types it cannot
   check. Copying that in disables the plugin on the next reload, so the type
   checker runs first and a failing check copies nothing. */
function typesPass() {
  try {
    execFileSync('node_modules/.bin/tsc', ['-noEmit', '-skipLibCheck'], { stdio: 'pipe' });
    return true;
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim();
    console.warn(`Skipped vault copy: type errors\n${output}`);
    return false;
  }
}

/* Obsidian reloads the plugin in place, so a save is visible without touching
   the Community plugins screen. Skipped when the CLI is not on PATH. */
function reload(target) {
  const args = ['plugin:reload', `id=${PLUGIN_ID}`];
  const vault = vaultName(target);
  if (vault) args.push(`vault=${vault}`);
  execFile('obsidian', args, (error, stdout) => {
    if (error) console.warn(`Skipped plugin reload: ${error.message}`);
    else console.log((stdout || '').trim() || `Reloaded: ${PLUGIN_ID}`);
  });
}

const installIntoVault = {
  name: 'install-into-vault',
  setup(build) {
    build.onEnd((result) => {
      const target = pluginFolder();
      if (result.errors.length > 0 || target === null || !typesPass()) return;
      try {
        fs.mkdirSync(target, { recursive: true });
        for (const file of INSTALLED) {
          if (fs.existsSync(file)) fs.copyFileSync(file, path.join(target, file));
        }
        console.log(`Copied plugin to ${target}`);
        reload(target);
      } catch (error) {
        console.warn(`Skipped vault copy: ${error.message}`);
      }
    });
  },
};

/* Obsidian loads main.js from the plugin folder, so the bundle lands in the repo
   root next to manifest.json - that pair is what gets installed. */
const context = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian', 'electron', ...builtinModules, ...builtinModules.map((n) => `node:${n}`)],
  format: 'cjs',
  target: 'es2020',
  platform: 'browser',
  logLevel: 'info',
  sourcemap: production ? false : 'inline',
  treeShaking: true,
  minify: production,
  outfile: 'main.js',
  plugins: production ? [] : [installIntoVault],
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
