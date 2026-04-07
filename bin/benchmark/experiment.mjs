import { latestTarball, buildEmberSource } from './utils.mjs';

export async function buildExperimentTarball({ repoDir, reuse = false }) {
  if (reuse) {
    try {
      return await latestTarball(repoDir);
    } catch {
      // fall through; rebuild
    }
  }

  await buildEmberSource(repoDir);
  return await latestTarball(repoDir);
}
