/* eslint-disable no-console */
/* eslint-disable n/no-process-exit */

import { runBenchmark } from './benchmark/run.mjs';
import { hasFlag } from './benchmark/utils.mjs';

if (hasFlag(process.argv, '--help', '-h')) {
  console.log(`
Runs tracerbench compare between origin/main and your current working tree.

NOTE: only ember-source is linked, not other packages.

Output directory:
  tracerbench-testing/

Options:
	 --force                  delete cached directories before running
     --reuse                  reuse existing apps and tarballs, if available (by default only the control app/tarball is reused)

Notes:
	- This script runs \`pnpm install\` and \`node ./bin/build-for-publishing.js\` in both repos.
	- build-for-publishing updates files in-place; it will modify your working tree.
	- Benchmark apps are built with \`vite build\` and served using \`vite preview\`.
`);
  process.exit(0);
}

const FORCE = hasFlag(process.argv, '--force');
const REUSE = hasFlag(process.argv, '--reuse');

try {
  await runBenchmark({
    force: FORCE,
    reuse: REUSE,
  });
} catch (error) {
  console.error(error);
  process.exit(1);
}
