// @ts-check

/**
 * @import { InfiniteDepthConfigWithExtends } from "typescript-eslint";
 */

import { join } from 'node:path';

import packageInfos from '@glimmer-workspace/repo-metadata';
import jsonc from 'eslint-plugin-jsonc';

/**
 * @type {InfiniteDepthConfigWithExtends}
 */
export const JSON_CONFIG = /** @type {const} */ ({
  name: 'package.json files',
  files: packageInfos.map((pkg) => join(pkg.root, 'package.json')),
  // @ts-expect-error the extends type is narrow and not always ecosystem-compatible
  extends: [jsonc.configs['flat/recommended-with-jsonc']],
  rules: {
    // Enforce order in the scripts object
    // https://ota-meshi.github.io/eslint-plugin-jsonc/rules/sort-keys.html
    'jsonc/sort-keys': [
      'error',
      {
        // root properties
        pathPattern: '^$',
        order: [
          'name',
          'version',
          'license',
          'description',
          'repository',
          'author',
          'type',
          'exports',
          'imports',
          'publishConfig',
          'files',
          'scripts',
          'dependencies',
          'peerDependencies',
          'devDependencies',
          'release-it',
          'changelog',
          'engines',
          'volta',
        ],
      },
      {
        pathPattern:
          'scripts|dependencies|devDependencies|peerDependencies|optionalDependencies|pnpm|overrides|peerDependencyRules|patchedDependencies|dependenciesMeta',
        order: { type: 'asc' },
      },
      // ...
    ],
  },
});
