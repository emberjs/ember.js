import { $ } from 'zx';
import chalk from 'chalk';
import { packages } from './packages.mjs';

/*
  Example JSON entry:

  {
    name: '@glimmer/validator',
    version: '0.92.3',
    path: '/home/ykatz/Code/Ember/glimmer-vm/packages/@glimmer/validator',
    private: false,
    dependencies: {
      '@glimmer/env': [Object],
      '@glimmer/global-context': [Object],
      '@glimmer/interfaces': [Object],
      '@glimmer/util': [Object]
    },
    devDependencies: {
      '@glimmer-workspace/build-support': [Object],
      '@glimmer/debug-util': [Object],
      '@glimmer/local-debug-flags': [Object],
      eslint: [Object],
      publint: [Object],
      rollup: [Object],
      typescript: [Object]
    }
  }
*/

/**
 * @typedef {} PackageEntry
 */

const entries = await packages('@glimmer');

const quiet = process.argv.includes('--quiet') || process.argv.includes('-q');

for (const entry of entries) {
  console.log(entry.name);
  if (!quiet) console.error(chalk.gray(`  ${entry.path}`));
}
