// @ts-check
import { createUpdateOptions } from '@pnpm/meta-updater';
import repo, { getPackageInfo, WORKSPACE_ROOT } from '@glimmer-workspace/repo-metadata';
import { json, packageJson } from './formats/json.mjs';
import { code } from './formats/code.mjs';

/**
 * @import { PackageInfo } from '@glimmer-workspace/repo-metadata';
 * @import { JsonObject, JsonValue } from 'type-fest';
 */

const REMOVE = undefined;

export default () =>
  createUpdateOptions({
    files: {
      'package.json [#manifest]': (actual) => {
        if (!actual || !actual.name) return actual;

        const pkg = getPackageInfo(actual.name);
        let publishConfig = /** @type { JsonObject} */ (actual.publishConfig ??= {});

        if (pkg) {
          const isPublished = !pkg.private;
          const isRoot = pkg.name === 'glimmer-engine';

          const scripts = /** @type { JsonObject } */ (actual.scripts ??= {});

          // replaced with prepack
          delete scripts['test:types'];
          delete scripts['test:lint'];

          const updateRepo = () => {
            update(actual, 'repository', {
              type: 'git',
              url: 'git+https://github.com/glimmerjs/glimmer-vm.git',
              ...(pkg.root
                ? {
                    directory: pkg.root,
                  }
                : {}),
            });
          };

          if (isPublished) {
            updateRepo();
            update(publishConfig, 'access', 'public');
          } else if (pkg['repo-meta']?.built) {
            delete publishConfig['access'];
          } else {
            publishConfig = actual.publishConfig = {};

            update(actual, 'version', repo.workspace.version);
            /**
             * Needed for release automation
             */
            if (isRoot) {
              updateRepo();
              update(scripts, 'test:lint', 'eslint . --quiet');
            } else {
              delete actual.repository;
            }
            delete scripts['test:publint'];
            cleanup(actual, 'publishConfig');
            return actual;
          }

          update(scripts, 'test:publint', 'publint');

          // Packages are built if they're published and have at least one `.ts` entry point that is
          // not a `.d.ts` file **or** if they are explicitly marked as built via `repo-meta.built`.
          if (pkg['repo-meta']?.built) {
            const devDependencies = /** @type { JsonObject } */ (actual.devDependencies ??= {});

            update(devDependencies, '@glimmer-workspace/env', 'workspace:*');

            update(scripts, 'prepack', 'rollup -c rollup.config.mjs');

            update(actual, 'files', ['dist']);

            update(publishConfig, 'exports', {
              development: {
                types: './dist/dev/index.d.ts',
                default: './dist/dev/index.js',
              },
              default: {
                types: './dist/prod/index.d.ts',
                default: './dist/prod/index.js',
              },
            });
          } else {
            delete publishConfig['exports'];
            delete scripts['prepack'];
          }
        }

        cleanup(actual, 'publishConfig');
        return actual;
      },

      'rollup.config.mjs [#code]': (actual, { manifest }) => {
        if (!manifest.name) return actual;

        const pkg = getPackageInfo(manifest.name);

        if (pkg?.root === '') {
          return actual;
        }

        // If the package needs to be built, generate a rollup config
        // that builds the package. This will be used by the `build`
        // script, which is set up below in `package.json`.
        if (pkg?.['repo-meta']?.built) {
          return (
            [
              `import { Package } from '@glimmer-workspace/build-support';`,
              `export default Package.config(import.meta);`,
            ].join('\n\n') + '\n'
          );
        }

        return null;
      },
    },
    formats: {
      '#manifest': packageJson,
      '#code': code,
      '.json': json,
    },
  });

/**
 * Update an existing field. The code is structured this way to keep the
 * diff reported by `meta-updater --test` as small as possible.
 *
 * @template {JsonObject} const T
 * @template {keyof T} const K
 * @template {T[K]} const Updates
 *
 * @param {T} parent
 * @param {K} key
 * @param {Updates} value
 * @returns {void}
 */
function update(parent, key, value) {
  const prev = JSON.stringify(parent[key]);
  const next = JSON.stringify(value);

  if (prev !== next) {
    parent[key] = value;
  }
}

/**
 * @template {JsonObject} const T
 * @template {keyof T} const K
 *
 * @param {T} parent
 * @param {K} key
 * @returns {void}
 */
function cleanup(parent, key) {
  const value = parent[key];
  if (value !== null && typeof value === 'object' && Object.keys(value).length === 0) {
    delete parent[key];
  }
}
