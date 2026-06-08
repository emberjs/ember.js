// Builds ember-source straight from source and reports which modules still
// have side effects after tree-shaking.
//
// The shipped build (rollup.config.mjs) emits shared chunks, so a surviving
// side-effect shows up against a mangled chunk name and you can't tell which
// source file caused it. Here we re-run that *same* config with
// `preserveModules: true`, which keeps a 1:1 module->file mapping and leaves
// names unmangled, so every flagged file is the source file actually
// responsible. We deliberately do not put preserveModules in rollup.config.mjs
// itself — the shipped build wants its chunks.
//
// This runs as a subprocess (see build.js) with cwd = repo root, because
// rollup.config.mjs globs `packages/` relative to cwd when it is imported.
// Results are written as JSON to the path given in argv[2].
import { rollup } from 'rollup';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import glob from 'glob';
import { doesHaveSideEffects } from './has-side-effects.js';
import config from '../../../rollup.config.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const manifestPath = resolve(repoRoot, 'package.json');

// rollup.config.mjs's `package-meta` plugin rewrites package.json's
// `ember-addon.renamed-modules` during a build; the probe must leave the
// manifest alone, so we drop it. We also assert below that nothing else touched
// package.json, which catches this plugin being renamed out from under us.
const MANIFEST_PLUGINS = new Set(['package-meta']);

async function buildPreservedModules(buildConfig, outDir) {
  let plugins = buildConfig.plugins.filter((plugin) => !MANIFEST_PLUGINS.has(plugin.name));
  let bundle = await rollup({
    onLog() {},
    input: buildConfig.input,
    treeshake: buildConfig.treeshake,
    plugins,
  });
  try {
    await bundle.write({
      format: 'es',
      dir: outDir,
      preserveModules: true,
      preserveModulesRoot: 'packages',
      generatedCode: 'es2015',
      hoistTransitiveImports: false,
    });
  } finally {
    await bundle.close();
  }
}

function sourceName(rel) {
  // per-file entrypoints keep a leading `packages/`; submodules of rolled-up
  // packages (e.g. @glimmer/runtime/*) are emitted without it
  if (rel.startsWith('packages/')) rel = rel.slice('packages/'.length);
  // dormant guard: with the current config every module emits under `packages/`,
  // but a config that externalizes a dependency differently can emit it under
  // node_modules/.pnpm/<pkg>@<version>/node_modules/<pkg>/... — collapse that to
  // the bare package path so the snapshot doesn't churn on dependency versions.
  let match = rel.match(/node_modules\/\.pnpm\/[^/]+\/node_modules\/(.+)$/);
  return match ? match[1] : rel;
}

async function sideEffectfulModules(outDir) {
  let files = glob.sync('**/*.js', { cwd: outDir, nodir: true, absolute: true });
  let flagged = new Set();
  let batchSize = 60;
  for (let i = 0; i < files.length; i += batchSize) {
    let batch = files.slice(i, i + batchSize);
    let results = await Promise.all(batch.map((file) => doesHaveSideEffects(file)));
    batch.forEach((file, index) => {
      if (results[index]) flagged.add(sourceName(relative(outDir, file)));
    });
  }
  return [...flagged].sort();
}

let esmConfigs = config.filter(
  (entry) => typeof entry.output?.dir === 'string' && entry.output.dir.startsWith('dist/')
);
let devConfig = esmConfigs.find((entry) => entry.output.dir.includes('dev'));
let prodConfig = esmConfigs.find((entry) => entry.output.dir.includes('prod'));

if (!devConfig || !prodConfig) {
  throw new Error('expected one dist/dev and one dist/prod ESM config in rollup.config.mjs');
}

let manifestBefore = readFileSync(manifestPath);
let tmp = mkdtempSync(resolve(tmpdir(), 'ember-tree-shake-'));
try {
  let devDir = resolve(tmp, 'dev');
  let prodDir = resolve(tmp, 'prod');
  await buildPreservedModules(devConfig, devDir);
  await buildPreservedModules(prodConfig, prodDir);

  if (!readFileSync(manifestPath).equals(manifestBefore)) {
    throw new Error(
      'the probe build mutated package.json; a manifest-writing plugin was not stripped'
    );
  }

  let dev = await sideEffectfulModules(devDir);
  let prod = await sideEffectfulModules(prodDir);
  writeFileSync(process.argv[2], JSON.stringify({ dev, prod }));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
