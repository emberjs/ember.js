import { execSync } from 'node:child_process';

import chalk from 'chalk';

import { packages } from './packages.mjs';

for (const pkg of packages('@glimmer')) {
  console.log(`${chalk.gray('# publishing')} ${chalk.cyanBright(pkg.name)}`);
  execSync('yalc publish --push', {
    cwd: pkg.path,
    stdio: 'inherit',
  });
}
