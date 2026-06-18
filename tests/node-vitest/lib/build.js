import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const worker = resolve(here, 'find-side-effects.js');

let cached;

/**
 * Builds ember-source from source (with `preserveModules: true`) and returns
 * the sorted list of source modules that still have side effects, for the
 * `dev` and `prod` builds. The actual work runs in a subprocess so the real
 * rollup.config.mjs executes in plain node with cwd = repo root (it globs
 * `packages/` relative to cwd at import time).
 */
export function findSideEffectfulModules() {
  if (cached) return cached;

  let resultFile = resolve(tmpdir(), `ember-tree-shake-${process.pid}.json`);
  try {
    execFileSync(process.execPath, [worker, resultFile], {
      cwd: repoRoot,
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    let result = JSON.parse(readFileSync(resultFile, 'utf8'));
    if (!Array.isArray(result?.dev) || !Array.isArray(result?.prod)) {
      throw new Error(
        `find-side-effects worker produced unexpected output: ${JSON.stringify(result)}`
      );
    }
    cached = result;
  } finally {
    rmSync(resultFile, { force: true });
  }
  return cached;
}
