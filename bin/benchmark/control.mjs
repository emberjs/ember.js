import { join } from 'node:path';

import fs from 'fs-extra';

import { buildEmberSource, latestTarball, run } from './utils.mjs';

const { ensureDir, pathExists } = fs;

export async function getOrBuildControlTarball({ repoRoot, controlRepoDir, controlBranchName }) {
  try {
    return await latestTarball(controlRepoDir);
  } catch {
    // fall through; rebuild
  }

  await run('git', ['fetch', 'origin'], { cwd: repoRoot });
  const controlRef = (
    await run('git', ['rev-parse', `origin/${controlBranchName}`], {
      cwd: repoRoot,
    })
  ).trim();

  if (!(await pathExists(controlRepoDir))) {
    await ensureDir(controlRepoDir);
    // clone from the local .git directory (fast, avoids network)
    await run('git', ['clone', join(repoRoot, '.git'), controlRepoDir]);
  } else {
    await run('git', ['fetch'], { cwd: controlRepoDir });
  }

  await run('git', ['checkout', '--force', controlRef], { cwd: controlRepoDir });
  await buildEmberSource(controlRepoDir);
  return await latestTarball(controlRepoDir);
}
