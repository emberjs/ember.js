// `<package>/vite` — the Vite preset of the gxt-native Ember package.
//
// Source of `vite/index.mjs` in the package that
// scripts/build-gxt-native-package.mjs assembles. It runs from INSIDE the
// installed package (paths are relative to this file), never from the repo.
//
//   import { defineConfig } from 'vite';
//   import { emberGxtNative } from 'ember-source/vite'; // npm alias, or '<package>/vite'
//   export default defineConfig({ plugins: [emberGxtNative(), babel(...)] });
//
// What it does:
//   1. resolves Ember's module namespace into THIS package's dist — exactly the
//      specifiers the dist publishes (its `renamed-modules`), `dist/dev` for a
//      development build / the dev server and `dist/prod` otherwise;
//      `@glimmer/component` always resolves to the copy shipped with the
//      package, and `@lifeart/gxt*` to the gxt this package depends on, so the
//      bundle holds ONE copy of each whatever node_modules contains;
//   2. compiles `.gjs` / `.gts` and build-time `precompileTemplate(…)` with the
//      gxt compiler under the NATIVE_FLAGS the dist was built with (read from
//      the package's `dist/gxt-native-contract.json` — app and dist cannot
//      drift); the decorators it lowers import decorator-transforms' runtime
//      (`./decorator-runtime.mjs`), as an Embroider app's babel config makes
//      them, so the app needs no `dt7948` global;
//   3. fails loudly instead of building something subtly wrong: a gxt that
//      lacks an export the dist imports (e.g. the published 0.0.81, which
//      predates the native hooks), a second gxt copy, @embroider/vite's
//      template / resolver plugins in the same build, an import of a Glimmer VM
//      package or of a module this package does not ship.
import { readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAst } from 'vite';
import { compiler as gxtCompiler } from '@lifeart/gxt/compiler';
import { importDecoratorRuntime } from './decorator-runtime.mjs';

const PKG_ROOT = fileURLToPath(new URL('..', import.meta.url));
const PKG = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8'));
const CONTRACT = JSON.parse(
  readFileSync(join(PKG_ROOT, 'dist', 'gxt-native-contract.json'), 'utf8')
);
const LABEL = `${PKG.name}@${PKG.version}`;
// @glimmer/component, per dist mode (`{ dev, prod }`).
const glimmerComponentFile = (mode) => join(PKG_ROOT, CONTRACT.glimmerComponent[mode]);

// Plugins that would compile / resolve Ember templates the CLASSIC way in the
// same build (@embroider/vite). Mixing them with the gxt compiler cannot work:
// the native runtime has no Glimmer VM to run wire-format templates.
const CONFLICTING_PLUGINS = new Map([
  ['embroider-template-tag', '@embroider/vite templateTag() / ember()'],
  ['rollup-hbs-plugin', '@embroider/vite hbs()'],
  ['embroider-resolver', '@embroider/vite resolver() / ember()'],
]);

function fail(message) {
  throw new Error(`[${LABEL}] ${message}`);
}

// specifier → file, per dist mode, from the published entry list (the dist's
// renamed-modules keys: `@ember/array/proxy.js`, `@ember/application/index.js`).
function publishedMap(mode) {
  const map = new Map();
  for (const key of CONTRACT.entries) {
    const file = join(PKG_ROOT, 'dist', mode, 'packages', key);
    map.set(key, file);
    const bare = key.replace(/\.js$/, '');
    map.set(bare, file);
    if (bare.endsWith('/index')) map.set(bare.slice(0, -'/index'.length), file);
  }
  return map;
}

const PUBLISHED_EMBER_PACKAGES = new Set(
  CONTRACT.entries
    .filter((key) => key.startsWith('@ember/') && !key.startsWith('@ember/-internals/'))
    .map((key) => key.split('/').slice(0, 2).join('/'))
);

function packageOf(specifier) {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

// An import this package refuses, with the reason — or null to let the normal
// resolver handle it (other npm packages in the `@ember/` scope such as
// `@ember/test-waiters` / `@ember/string` are NOT part of ember-source).
function refusal(specifier) {
  const pkg = packageOf(specifier);
  if (CONTRACT.droppedEntries.includes(pkg)) {
    return `\`${specifier}\` is a Glimmer VM package; ${PKG.name} runs Ember on @lifeart/gxt and ships no Glimmer VM.`;
  }
  for (const { specifier: pruned, reason } of CONTRACT.prunedEntries) {
    if (specifier === pruned || specifier.startsWith(`${pruned}/`)) {
      return `\`${specifier}\` is not shipped: ${reason}`;
    }
  }
  if (specifier.startsWith('@ember/-internals/') || PUBLISHED_EMBER_PACKAGES.has(pkg)) {
    return `\`${specifier}\` is not a module ${LABEL} publishes (its dist has no such entry).`;
  }
  return null;
}

// Every name an ES module exports (vite's own parser, so no extra dependency).
function exportedNames(file) {
  const names = new Set();
  const ast = parseAst(readFileSync(file, 'utf8'));
  for (const node of ast.body) {
    if (node.type === 'ExportNamedDeclaration') {
      for (const s of node.specifiers) names.add(s.exported.name ?? s.exported.value);
      const d = node.declaration;
      if (d?.id) names.add(d.id.name);
      for (const v of d?.declarations ?? []) if (v.id.type === 'Identifier') names.add(v.id.name);
    } else if (node.type === 'ExportDefaultDeclaration') {
      names.add('default');
    } else if (node.type === 'ExportAllDeclaration') {
      if (node.exported) names.add(node.exported.name);
      else names.add('*'); // unknowable without following it: accept any name
    }
  }
  return names;
}

// The gxt this package depends on (resolved from this file, so a pnpm-strict
// app that does not list @lifeart/gxt itself still gets it).
const PKG_IMPORTER = join(PKG_ROOT, 'package.json');
const gxtFiles = new Map();
function gxtFile(specifier) {
  if (!gxtFiles.has(specifier)) gxtFiles.set(specifier, resolveGxt(specifier));
  return gxtFiles.get(specifier);
}
function resolveGxt(specifier) {
  try {
    return realpathSync(fileURLToPath(import.meta.resolve(specifier)));
  } catch (error) {
    fail(
      `cannot resolve \`${specifier}\` (${error.message}). This package needs @lifeart/gxt ${CONTRACT.gxt.version} — the build the dist was compiled against.`
    );
  }
}

// The dist imports these gxt names; a gxt without them would bundle (or fail at
// runtime in dev) with no hint of the real cause.
function verifyGxt() {
  const missing = [];
  for (const [specifier, names] of Object.entries(CONTRACT.gxt.requiredExports)) {
    const exported = exportedNames(gxtFile(specifier));
    if (exported.has('*')) continue;
    for (const name of names) if (!exported.has(name)) missing.push(`${specifier}#${name}`);
  }
  if (missing.length > 0) {
    fail(
      `the installed @lifeart/gxt does not provide ${missing.length} export(s) this dist imports: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ', …' : ''}. ` +
        `Install the gxt build the package was made with (@lifeart/gxt ${CONTRACT.gxt.version}${CONTRACT.gxt.gitHash ? `, git ${CONTRACT.gxt.gitHash}` : ''}); ` +
        `gxt releases without the Ember native hooks (up to 0.0.81) cannot run this dist.`
    );
  }
}

const isGxtSpecifier = (source) => source === '@lifeart/gxt' || source.startsWith('@lifeart/gxt/');

/**
 * @param {{ mode?: 'development' | 'production', disableHMR?: boolean }} [options]
 * @returns {import('vite').Plugin[]}
 */
export function emberGxtNative(options = {}) {
  let distMode = null;
  let published = null;
  let compiler = null;
  let serving = false;

  return [
    {
      name: 'ember-gxt-native:resolve',
      enforce: 'pre',
      config(userConfig, env) {
        const development =
          options.mode !== undefined
            ? options.mode === 'development'
            : env.mode === 'development' || (env.command === 'serve' && env.mode !== 'production');
        distMode = development ? 'dev' : 'prod';
        published = publishedMap(distMode);
        verifyGxt();

        const gxtMode = development ? 'development' : 'production';
        compiler = gxtCompiler(gxtMode, {
          flags: { ...CONTRACT.nativeFlags },
          disableHMR: options.disableHMR ?? !development,
        });
        // The gxt plugin merges its flags (and returns the `define` the gxt
        // runtime needs) in this hook; check every native flag made it.
        const gxtConfig = compiler.config(userConfig, { ...env, mode: gxtMode }) ?? {};
        const define = gxtConfig.define ?? {};
        const drift = Object.entries(CONTRACT.nativeFlags).filter(([k, v]) => define[k] !== v);
        if (drift.length > 0) {
          fail(
            `the gxt compiler did not take the native flags: ${drift.map(([k]) => k).join(', ')}`
          );
        }
        return {
          define,
          resolve: { extensions: gxtConfig.resolve?.extensions },
          optimizeDeps: {
            // Served as shipped: the dev pre-bundler must not copy Ember's
            // modules or gxt into an optimized chunk (a pre-bundled dependency
            // keeps these imports external instead), so every importer gets
            // the same file — as in the production build.
            exclude: [
              '@lifeart/gxt',
              '@glimmer/component',
              ...[...published.keys()].filter((key) => !key.endsWith('.js')),
            ],
          },
        };
      },
      configResolved(config) {
        serving = config.command === 'serve';
        for (const plugin of config.plugins) {
          const owner = CONFLICTING_PLUGINS.get(plugin.name);
          if (owner) {
            fail(
              `${owner} is in this build. ${PKG.name} compiles templates with the gxt compiler and resolves Ember itself; remove @embroider/vite's ember() / templateTag() / hbs() / resolver().`
            );
          }
        }
      },
      async resolveId(source, importer) {
        if (isGxtSpecifier(source)) {
          // Resolved as THIS package imports it (whoever the importer is —
          // compiled app templates too): one gxt copy under any package
          // manager layout, with vite's own handling of gxt's `sideEffects`
          // and the dev server's version query.
          const resolved = await this.resolve(source, PKG_IMPORTER, { skipSelf: true });
          const file = resolved && realpathSync(resolved.id.split('?')[0]);
          if (file !== gxtFile(source)) {
            fail(
              `\`${source}\` resolves to ${file}, not to this package's @lifeart/gxt (${gxtFile(source)})`
            );
          }
          return resolved;
        }
        const file =
          source === '@glimmer/component'
            ? glimmerComponentFile(distMode)
            : (published.get(source) ?? null);
        if (file === null) {
          const why = refusal(source);
          if (why) fail(why);
          return null;
        }
        if (!serving) return file;
        // Dev server: the file's RELATIVE importers (the dist's own chunks) get
        // vite's `?v=` dependency-version query; resolve through vite so a bare
        // import of the same file gets the same id — otherwise the browser
        // instantiates the module twice (two Router classes, …).
        return (await this.resolve(file, importer, { skipSelf: true })) ?? file;
      },
    },
    {
      name: 'ember-gxt-native:compile',
      enforce: 'pre',
      transform(code, id) {
        return importDecoratorRuntime(compiler.transform.call(this, code, id));
      },
    },
  ];
}

export default emberGxtNative;
