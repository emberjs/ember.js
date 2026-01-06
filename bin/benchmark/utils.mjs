/* eslint-disable n/no-unsupported-features/node-builtins */
/* eslint-disable no-console */
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { basename, join } from 'node:path';
import { styleText } from 'node:util';

import execa from 'execa';
import fs from 'fs-extra';
import { existsSync } from 'node:fs';

export const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const BENCH_ROOT = join(REPO_ROOT, 'tracerbench-testing');
const CWD = process.cwd();

const { copy, ensureDir, readdir, readFile, remove, stat, writeFile } = fs;

export function hasFlag(argv, ...names) {
  return names.some((name) => argv.includes(name));
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function lsof(port) {
  return execSync(`lsof -i :${port} -P -n`).toString;
}

export async function buildEmberSource(cwd) {
  await run('pnpm', ['install'], { cwd });
  await run('node', ['./bin/build-for-publishing.js'], { cwd });
}

/**
 * WARNING: this calls process.exit. Do not use if execution continuation is needed
 */
export function cleanError(e) {
  /* most tools will print their errors,
   * so we don't need to print a whole *additional* stack trace */
  if (e instanceof Error && e.message.startsWith('Command failed with exit code')) {
    const frames = e.stack
      ?.split('\n')
      .filter((line) => !line.includes('node_modules'))
      .filter((line) => line.includes(REPO_ROOT))
      .map((line) => line.replace(/\s+/, ''));

    const mostRelevantFrame = frames?.[0]?.replace(REPO_ROOT, '<repo>');

    if (mostRelevantFrame) {
      console.error(styleText('red', mostRelevantFrame));
    }

    if ('stdout' in e && e.stdout) {
      console.error(styleText('red', e.stdout));
    }
    if ('stderr' in e && e.stderr) {
      console.error(styleText('red', e.stderr));
    }

    if ('exitCode' in e && typeof e.exitCode === 'number') {
      // eslint-disable-next-line n/no-process-exit
      process.exit(e.exitCode);
    }

    throw new Error(`UNSAFE ERROR HANDLING: ${e.message}`);
  }

  // in JS, you can throw anything...
  throw e;
}

export async function run(command, args = [], options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const label = options.label ?? `${command} ${args.join(' ')}`;
  const quiet = options.quiet ?? false;

  if (!quiet) {
    let path = cwd.replace(CWD, '.');
    console.log(`
        ${styleText('cyan', path)}
        ${styleText('green', `→ ${label}`)}
    `);
  }

  try {
    const { stdout, stderr } = await execa(command, args, {
      cwd,
      ...(quiet ? {} : { stdio: 'inherit' }),
    });
    return { stdout, stderr };
  } catch (e) {
    cleanError(e);
  }
}

export async function latestTarball(repoDir) {
  const entries = await readdir(repoDir);
  const candidates = entries.filter((name) => /^ember-source-.*\.tgz$/.test(name));
  if (candidates.length === 0) {
    throw new Error(
      `No ember-source tarball found in ${repoDir}. Expected ember-source-<version>.tgz from npm pack.`
    );
  }

  const withStats = await Promise.all(
    candidates.map(async (name) => {
      const fullPath = join(repoDir, name);
      return { name, fullPath, mtimeMs: (await stat(fullPath)).mtimeMs };
    })
  );

  withStats.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return withStats[0].fullPath;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, json) {
  await writeFile(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
}

function copyFilter(src) {
  const name = basename(src);
  if (name === 'node_modules') return false;
  if (name === 'dist') return false;
  if (name === '.turbo') return false;
  if (name === '.vite') return false;
  return true;
}

export async function prepareApp({ sourceAppDir, destAppDir, emberSourceTarball, reuse = false }) {
  if (reuse) {
    if (existsSync(join(destAppDir, 'dist'))) {
      return;
    }
  }

  await remove(destAppDir);
  await ensureDir(destAppDir);
  await copy(sourceAppDir, destAppDir, { filter: copyFilter, overwrite: true });

  const tarballName = basename(emberSourceTarball);
  await copy(emberSourceTarball, join(destAppDir, tarballName), { overwrite: true });

  const packageJsonPath = join(destAppDir, 'package.json');
  const pkg = await readJson(packageJsonPath);

  pkg.devDependencies ??= {};

  // benchmark-app currently uses workspace:* for ember-source. Swap it to the tarball.
  pkg.devDependencies['ember-source'] = `file:./${tarballName}`;

  // NOTE: only ember-source is linked, not other packages.
  // Keep @glimmer/component non-workspace so the temp app can install outside the monorepo.
  pkg.devDependencies['@glimmer/component'] = '^2.0.0';

  await writeJson(packageJsonPath, pkg);

  await run('pnpm', ['install', '--prefer-frozen-lockfile', '--ignore-workspace'], {
    cwd: destAppDir,
  });
  await run('pnpm', ['vite', 'build'], { cwd: destAppDir });
}

export function startVitePreview({ appDir, port }) {
  return execa(
    'pnpm',
    ['vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      cwd: appDir,
      stdout: 'inherit',
      stderr: 'inherit',
    }
  );
}
