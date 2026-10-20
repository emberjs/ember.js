/**
 * Runs publint and arethetypeswrong on the packages this repo publishes.
 * Run `pnpm build` first.
 *
 * The checks read the packed tarballs, not the package folders,
 * because `pnpm pack` applies `publishConfig` (used by @glimmer/syntax).
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PACKAGES = [
  /**
   * These ship only ESM, so CommonJS and node10 resolution do not apply.
   */
  { dir: '.', attw: ['--profile', 'esm-only'] },
  { dir: 'packages/@glimmer/component', attw: ['--profile', 'esm-only'] },

  { dir: 'packages/@glimmer/syntax', attw: [] },
];

let failed = false;

function run(command, args, cwd) {
  process.stdout.write(`\n$ ${command} ${args.join(' ')}\n`);

  let result = spawnSync(command, args, { cwd, stdio: 'inherit' });

  if (result.status !== 0) {
    failed = true;
  }

  return result.status === 0;
}

for (let pkg of PACKAGES) {
  let destination = mkdtempSync(join(tmpdir(), 'check-packages-'));

  try {
    if (!run('pnpm', ['pack', '--pack-destination', destination], pkg.dir)) {
      continue;
    }

    let tarball = join(destination, readdirSync(destination)[0]);

    run('pnpm', ['exec', 'publint', tarball]);
    run('pnpm', ['exec', 'attw', tarball, ...pkg.attw]);
  } finally {
    rmSync(destination, { recursive: true, force: true });
  }
}

process.exitCode = failed ? 1 : 0;
