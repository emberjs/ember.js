/* eslint-disable n/no-process-exit */
import os from 'node:os';
import { join } from 'node:path';

import type { PackageJson } from 'type-fest';
import { WORKSPACE_ROOT } from '@glimmer-workspace/repo-metadata';
import fs from 'fs-extra';
import { $, which } from 'zx';

import { buildKrausestDeps } from './bench-packages.mts';

const { ensureDirSync, writeFileSync } = fs;

const ROOT = new URL('..', import.meta.url).pathname;
$.verbose = true;

const REUSE_CONTROL = !!process.env['REUSE_CONTROL'];

/*

  To run proper bench setup we need to do following things:

  1.) Compile control packages
  2.) Compile experiment packages
  3.) Use SAME benchmark source
      * we should be able to tweak bench
        (add more cases, and still be able to compare with control)
      * we should be able to re-run bench in CI from current branch with updated perf source

*/

const experimentRef =
  process.env['EXPERIMENT_BRANCH_NAME'] || (await $`git rev-parse HEAD`).stdout.trim();
const controlBranchName = process.env['CONTROL_BRANCH_NAME'] || 'main';

// same order as in benchmark/benchmarks/krausest/lib/index.ts
const appMarkers = [
  'render',
  'render1000Items1',
  'clearItems1',
  'render1000Items2',
  'clearItems2',
  'render5000Items1',
  'clearManyItems1',
  'render5000Items2',
  'clearManyItems2',
  'render1000Items3',
  'append1000Items1',
  'append1000Items2',
  'updateEvery10thItem1',
  'updateEvery10thItem2',
  'selectFirstRow1',
  'selectSecondRow1',
  'removeFirstRow1',
  'removeSecondRow1',
  'swapRows1',
  'swapRows2',
  'clearItems4',
].reduce((acc, marker) => {
  return acc + ',' + marker + 'Start,' + marker + 'End';
}, '');
const markers = (process.env['MARKERS'] || appMarkers)
  .split(',')
  .filter((el) => el.length)
  .join(',');
const fidelity = process.env['FIDELITY'] || '20';
const throttleRate = process.env['THROTTLE'] || '2';

const tempDir = os.tmpdir();

const CONTROL_DIRS = {
  root: join(tempDir, 'control'),
  repo: join(tempDir, 'control/repo'),
  bench: join(tempDir, 'control/bench'),
};
const EXPERIMENT_DIRS = {
  root: join(tempDir, 'experiment'),
  bench: join(tempDir, 'experiment/bench'),
  src: join(WORKSPACE_ROOT, 'benchmark/benchmarks/krausest'),
};

const CONTROL_PORT = 4020;
const EXPERIMENT_PORT = 4021;
const CONTROL_URL = `http://localhost:${CONTROL_PORT}`;
const EXPERIMENT_URL = `http://localhost:${EXPERIMENT_PORT}`;

const pnpm = await which('pnpm');

// set up experiment
{
  await $`rm -rf ${EXPERIMENT_DIRS.root}`;
  await $`mkdir -p ${EXPERIMENT_DIRS.bench}`;
  await $`cp -r ${EXPERIMENT_DIRS.src}/* ${EXPERIMENT_DIRS.bench}/`;
  await $`${pnpm} build --output-logs=new-only`;
  await buildKrausestDeps({
    roots: { benchmark: EXPERIMENT_DIRS.bench, workspace: WORKSPACE_ROOT },
  });
  await $`rm -r ${EXPERIMENT_DIRS.bench}/node_modules`;
  await $({ cwd: EXPERIMENT_DIRS.bench })`${pnpm} install`;
  await $({ cwd: EXPERIMENT_DIRS.bench })`${pnpm} vite build`;
}

// make sure that the origin is up to date so we get the right control
await $`git fetch origin`;

// now we can get the ref of the control branch so we can check it out later
const controlRef = (await $`git rev-parse origin/main`).stdout.trim();

console.info({
  control: controlBranchName,
  experiment: experimentRef,
  EXPERIMENT_DIRS,
  CONTROL_DIRS,
});

// set up control
{
  if (!REUSE_CONTROL) {
    await $`rm -rf ${CONTROL_DIRS.root}`;
    await $`mkdir -p ${CONTROL_DIRS.bench}`;

    // Intentionally use the `krausest` folder from the experiment in both
    // control and experiment
    await $`cp -r ${EXPERIMENT_DIRS.src}/* ${CONTROL_DIRS.bench}/`;

    // clone the raw git repo for the experiment
    await $`git clone ${join(ROOT, '.git')} ${CONTROL_DIRS.repo}`;
  }

  await $({ cwd: CONTROL_DIRS.repo })`git checkout --force ${controlRef}`;
  await $({ cwd: CONTROL_DIRS.repo })`${pnpm} install`;
  await $({ cwd: CONTROL_DIRS.repo })`${pnpm} build --output-logs=new-only`;

  const benchmarkEnv = join(CONTROL_DIRS.repo, 'packages/@glimmer-workspace/benchmark-env');

  // Right now, the `main` branch of `@glimmer-workspace/benchmark-env` does not have a buildable
  // version of `@glimmer-workspace/benchmark-env`, so we need to manually build it.
  //
  // Once this PR is merged, we can remove this code because all future control branches will have
  // built `@glimmer-workspace/benchmark-env` in the `pnpm build` step above.
  writeFileSync(
    join(benchmarkEnv, 'rollup.config.mjs'),
    [
      `import { Package } from '@glimmer-workspace/build-support';`,

      `export default Package.config(import.meta);`,
    ].join('\n\n')
  );

  const manifest = JSON.parse(
    await fs.readFile(join(benchmarkEnv, 'package.json'), 'utf8')
  ) as PackageJson;
  manifest.publishConfig ??= {};
  manifest.publishConfig['exports'] = './dist/prod/index.js';
  writeFileSync(join(benchmarkEnv, 'package.json'), JSON.stringify(manifest, null, 2), 'utf8');

  // This is also a patch for incorrect behavior on the current `main`.
  await $({ cwd: benchmarkEnv })`${pnpm} rollup --config rollup.config.mjs --external`;

  await buildKrausestDeps({
    roots: { benchmark: CONTROL_DIRS.bench, workspace: CONTROL_DIRS.repo },
  });

  await $`rm -r ${CONTROL_DIRS.bench}/node_modules`;
  await $({ cwd: CONTROL_DIRS.bench })`${pnpm} install`;
  await $({ cwd: CONTROL_DIRS.bench })`${pnpm} vite build`;
}

// Intentionally don't await these. TODO: Investigate if theer's a better structure.
void $`cd ${CONTROL_DIRS.bench} && pnpm vite preview --port ${CONTROL_PORT}`;
void $`cd ${EXPERIMENT_DIRS.bench} && pnpm vite preview --port ${EXPERIMENT_PORT}`;

await new Promise((resolve) => {
  // giving 5 seconds for the server to start
  setTimeout(resolve, 5000);
});

try {
  const output =
    await $`node --single-threaded-gc ./node_modules/tracerbench/bin/run compare --regressionThreshold 25 --sampleTimeout 60 --fidelity ${fidelity} --markers ${markers} --controlURL ${CONTROL_URL} --experimentURL ${EXPERIMENT_URL} --report --headless --cpuThrottleRate ${throttleRate}`;

  ensureDirSync('tracerbench-results');
  writeFileSync(
    'tracerbench-results/msg.txt',
    output.stdout.split('Benchmark Results Summary').pop() ?? ''
  );
} catch (p) {
  console.error(p);
  process.exit(1);
}

process.exit(0);
