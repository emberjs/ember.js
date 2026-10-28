/**
 * Runs publint and arethetypeswrong on the packages this repo publishes.
 * Run `pnpm build` first.
 *
 * The checks read the packed tarballs, not the package folders,
 * because `pnpm pack` applies `publishConfig` (used by @glimmer/syntax).
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { publint } from 'publint';
import { formatMessage } from 'publint/utils';

const PACKAGES = [
  {
    dir: '.',
    /**
     * ESM only, so CommonJS and node10 resolution do not apply.
     */
    attw: ['--profile', 'esm-only'],
    /**
     * `main` is the ember-cli addon entry.
     * A "." export would make `import 'ember-source'` load it.
     */
    ignore: ['EXPORTS_MISSING_ROOT_ENTRYPOINT'],
  },
  {
    dir: 'packages/@glimmer/component',
    attw: ['--profile', 'esm-only'],
    ignore: [],
  },
  {
    dir: 'packages/@glimmer/syntax',
    attw: [],
    ignore: [],
  },
];

let failed = false;

function run(command, args, { cwd, quiet = false } = {}) {
  process.stdout.write(`\n$ ${command} ${args.join(' ')}\n`);

  let result = spawnSync(command, args, {
    cwd,
    stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  if (result.status !== 0) {
    failed = true;

    /**
     * The output of a quiet command is only useful when it fails.
     */
    if (quiet) {
      process.stdout.write(result.stdout);
      process.stderr.write(result.stderr);
    }
  }

  return result.status === 0;
}

/**
 * The publint CLI exits 0 on warnings, and warnings include
 * "does not match any files". So every warning fails here,
 * except the codes in `ignore`.
 */
async function lint(tarball, ignore) {
  process.stdout.write(`\n$ publint ${tarball}\n`);

  let bytes = readFileSync(tarball);

  let { messages, pkg } = await publint({
    /**
     * Small files share a pooled ArrayBuffer, so slice to this file.
     */
    pack: { tarball: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) },
    level: 'warning',
  });

  let problems = messages.filter((message) => !ignore.includes(message.code));

  for (let message of problems) {
    process.stdout.write(`${message.type}: ${formatMessage(message, pkg, { color: false })}\n`);
  }

  if (problems.length > 0) {
    failed = true;
  } else {
    process.stdout.write('No problems found\n');
  }
}

for (let pkg of PACKAGES) {
  let destination = mkdtempSync(join(tmpdir(), 'check-packages-'));

  try {
    if (!run('pnpm', ['pack', '--pack-destination', destination], { cwd: pkg.dir, quiet: true })) {
      continue;
    }

    let tarball = join(destination, readdirSync(destination)[0]);

    await lint(tarball, pkg.ignore);
    run('pnpm', ['exec', 'attw', tarball, ...pkg.attw]);
  } finally {
    rmSync(destination, { recursive: true, force: true });
  }
}

process.exitCode = failed ? 1 : 0;
