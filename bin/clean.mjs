import { join } from 'node:path';

import repo, { isRoot } from '@glimmer-workspace/repo-metadata';
import { rimraf } from 'rimraf';

for (const pkg of repo.packages) {
  if (isRoot(pkg)) continue;
  await rimraf(join(pkg.root, 'dist'));
}

// await rimraf('**/{dist,.turbo,node_modules}/', { glob: true });
