/* eslint-disable no-console */
import { join } from 'node:path';
import { killPortProcess } from 'kill-port-process';

import fs from 'fs-extra';

import { getOrBuildControlTarball } from './control.mjs';
import { buildExperimentTarball } from './experiment.mjs';
import { run, prepareApp, sleep, startVitePreview, lsof } from './utils.mjs';

const { ensureDir, remove, writeFile } = fs;

function buildMarkersString(markers) {
  return markers
    .reduce((acc, marker) => {
      return acc + ',' + marker + 'Start,' + marker + 'End';
    }, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(',');
}

// Default configuration for runBenchmark
const DEFAULT_CONTROL_BRANCH_NAME = 'main';
const DEFAULT_CONTROL_APP_FROM_MAIN = false;
const DEFAULT_CONTROL_PORT = 4500;
const DEFAULT_EXPERIMENT_PORT = 4501;
const DEFAULT_FIDELITY = process.env['RUNS'] || '20';
const DEFAULT_THROTTLE = '1';
const DEFAULT_REGRESSION_THRESHOLD = '25';
const DEFAULT_SAMPLE_TIMEOUT = '60';
const DEFAULT_MARKERS = [
  // Copied from glimmer-vm/bin/setup-bench.mts (krausest benchmark)
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
];

import { REPO_ROOT, BENCH_ROOT } from './utils.mjs';

export async function runBenchmark({ force = false, reuse = false } = {}) {
  // Use config constants directly; no local re-assignment

  await ensureDir(BENCH_ROOT);

  const CONTROL_DIRS = {
    repo: join(BENCH_ROOT, 'ember-source-control'),
    app: join(BENCH_ROOT, 'control'),
  };
  const EXPERIMENT_DIRS = {
    app: join(BENCH_ROOT, 'experiment'),
    repo: REPO_ROOT,
  };

  const controlUrl = `http://127.0.0.1:${DEFAULT_CONTROL_PORT}`;
  const experimentUrl = `http://127.0.0.1:${DEFAULT_EXPERIMENT_PORT}`;
  const markersString = buildMarkersString(DEFAULT_MARKERS);

  if (force) {
    await killPortProcess([DEFAULT_CONTROL_PORT, DEFAULT_EXPERIMENT_PORT]);
    await remove(CONTROL_DIRS.repo);
    await remove(CONTROL_DIRS.app);
    await remove(EXPERIMENT_DIRS.app);
  }

  await ensureDir(BENCH_ROOT);
  await ensureDir(EXPERIMENT_DIRS.app);
  await ensureDir(CONTROL_DIRS.app);

  const controlTarball = await getOrBuildControlTarball({
    repoRoot: REPO_ROOT,
    controlRepoDir: CONTROL_DIRS.repo,
    controlBranchName: DEFAULT_CONTROL_BRANCH_NAME,
  });

  const experimentTarball = await buildExperimentTarball({
    repoDir: EXPERIMENT_DIRS.repo,
    reuse,
  });

  const experimentAppSource = join(REPO_ROOT, 'smoke-tests/benchmark-app');
  const controlAppSource = DEFAULT_CONTROL_APP_FROM_MAIN
    ? join(CONTROL_DIRS.repo, 'smoke-tests/benchmark-app')
    : experimentAppSource;

  await Promise.all([
    prepareApp({
      sourceAppDir: controlAppSource,
      destAppDir: CONTROL_DIRS.app,
      emberSourceTarball: controlTarball,
      reuse,
    }),
    prepareApp({
      sourceAppDir: experimentAppSource,
      destAppDir: EXPERIMENT_DIRS.app,
      emberSourceTarball: experimentTarball,
      reuse,
    }),
  ]);

  // These will error if the parts are occupied (--strict-port)
  startVitePreview({ appDir: CONTROL_DIRS.app, port: DEFAULT_CONTROL_PORT });
  startVitePreview({
    appDir: EXPERIMENT_DIRS.app,
    port: DEFAULT_EXPERIMENT_PORT,
  });

  async function cleanup() {
    console.log(`\n\tCleaning up servers...`);

    await killPortProcess([DEFAULT_CONTROL_PORT, DEFAULT_EXPERIMENT_PORT]);
  }

  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  });

  // give servers a moment to start
  await sleep(5000);

  /**
   * We need to make sure both servers are running before starting the benchmark.
   */
  let controlLsof = await lsof(DEFAULT_CONTROL_PORT);
  let experimentLsof = await lsof(DEFAULT_EXPERIMENT_PORT);

  if (!controlLsof || !experimentLsof) {
    throw new Error(
      `One of the servers failed to start. Control server lsof:\n${controlLsof}\n\nExperiment server lsof:\n${experimentLsof}`
    );
  }

  const tracerbenchBin = join(REPO_ROOT, 'node_modules/tracerbench/bin/run');

  const args = [
    '--single-threaded-gc',
    tracerbenchBin,
    'compare',
    '--regressionThreshold',
    DEFAULT_REGRESSION_THRESHOLD,
    '--sampleTimeout',
    DEFAULT_SAMPLE_TIMEOUT,
    '--fidelity',
    DEFAULT_FIDELITY,
    '--controlURL',
    controlUrl,
    '--experimentURL',
    experimentUrl,
    '--report',
    '--headless',
    '--cpuThrottleRate',
    DEFAULT_THROTTLE,
    '--markers',
    markersString,
    '--debug',
    '--browserArgs',
    `"--incognito,--disable-gpu,--mute-audio,--log-level=3,--headless=new"`,
  ];

  const output = await run('node', args, { cwd: EXPERIMENT_DIRS.app });
  const msgFile = join(BENCH_ROOT, 'msg.txt');

  if (!process.env.CI) {
    await writeFile(
      msgFile,
      output.stdout.split('Benchmark Results Summary').pop() ?? output.stdout,
      'utf8'
    );
  }

  await cleanup();

  return {
    benchRoot: BENCH_ROOT,
    msgFile,
    controlUrl,
    experimentUrl,
  };
}
