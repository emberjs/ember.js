// @ts-check

import { FlatCompat } from '@eslint/eslintrc';
import jslint from '@eslint/js';
import repoMeta, { WORKSPACE_ROOT } from '@glimmer-workspace/repo-metadata';
import tsParser from '@typescript-eslint/parser';

import javascript from './base/javascript.js';
import { JSON_CONFIG } from './base/json.js';
import typescript from './base/typescript.js';
import * as filters from './filters.js';

/**
 * @import { PackageInfo } from '@glimmer-workspace/repo-metadata';
 * @import { Linter } from 'eslint';
 * @import { ConfigOptions, FilterName, PackageFilter, PackageQuery, SomePackageFilter } from './types';
 * @import { ConfigArray, InfiniteDepthConfigWithExtends } from 'typescript-eslint';
 */

/**
 * @param {string} root
 * @returns {FlatCompat}
 */
export function Compat(root) {
  return new FlatCompat({
    baseDirectory: root,
    resolvePluginsRelativeTo: root,
    recommendedConfig: jslint.configs.recommended,
  });
}

export class WorkspaceConfig {
  /**
   * @param {string} [root]
   * @returns {WorkspaceConfig}
   */
  static root(root = WORKSPACE_ROOT) {
    return new WorkspaceConfig(root);
  }

  /**
   * @param {string} root
   */
  constructor(root) {
    this.root = root;
    this.compat = Compat(root);
  }

  /**
   * Returns the files and ignores for the specified packages.
   *
   * 1. For each glob returned by {@link #lintGlobs}, add `${pkgRoot}/${glob}.${ext}`
   * 2. All packages ignore files contained in directories name `node_modules` or `fixtures`
   *
   * @param {PackageInfo[]} packages
   * @param {string | string[]} extensions
   * @param {object} [options]
   * @param {string[]} [options.except] a list of globs to exclude (as absolute paths)
   * @returns {Pick<ConfigArray[number], 'files' | 'ignores'>}
   */
  #pkgFiles(packages, extensions, { except = [] } = {}) {
    const allExts = Array.isArray(extensions) ? extensions : [extensions];

    return {
      files: packages.flatMap((pkg) => {
        return this.#lintGlobs(pkg).flatMap((glob) => allExts.map((ext) => `${glob}.${ext}`));
      }),
      ignores: ['**/node_modules/**', '**/fixtures/**', '**/ts-dist/**', ...except],
    };
  }

  /**
   * Returns a list of globs to lint for the specified package (without extensions).
   *
   * ## Rules
   *
   * 1. If the package has a `repo-meta.lint` array, use that.
   * 2. If the package is a test package, include all files.
   * 3. Otherwise, include the index file and files in the lib/ directory.
   *
   * Note that `node_modules` are always excluded ({@link #pkgFiles}).
   *
   * @param {PackageInfo} pkg
   * @returns {string[]}
   */
  #lintGlobs(pkg) {
    const globs = pkg['repo-meta']?.lint;

    if (globs) {
      if (Array.isArray(globs)) {
        for (const glob of globs) {
          if (typeof glob !== 'string') {
            throw new Error(
              `repo-meta.lint must be an array of strings, got ${JSON.stringify(globs)}`
            );
          } else if (/\.[^/]*$/u.test(glob)) {
            throw new Error(
              `repo-meta.lint must be an array of globs without extensions, got ${JSON.stringify(globs)}`
            );
          }
        }
        return globs.map((glob) => `${pkg.root}/${glob}`);
      } else {
        throw new Error(`repo-meta.lint must be an array, got ${JSON.stringify(globs)}`);
      }
    } else if (matches(pkg, 'scope=@glimmer-test')) {
      return TEST_GLOBS.map((glob) => `${pkg.root}/${glob}`);
    } else {
      return PKG_GLOBS.map((glob) => `${pkg.root}/${glob}`);
    }
  }

  /**
   * @param {string} name
   * @param {ConfigOptions} options
   * @returns {InfiniteDepthConfigWithExtends}
   */
  code = (name, { filter: someFilter, ...options }) => {
    const { desc, matches } = parseFilter(someFilter);
    const packages = repoMeta.packages.filter(matches);

    return this.#code(`${name} (${desc})`, packages, options);
  };

  /**
   * @param {string} name
   * @param {ConfigOptions} options
   * @returns {InfiniteDepthConfigWithExtends}
   */
  override = (name, { filter: someFilter, files, extensions, ...options }) => {
    const { desc, matches } = parseFilter(someFilter);
    const packages = repoMeta.packages.filter(matches);

    const filesOptions = files
      ? { files }
      : this.#pkgFiles(packages, extensions ?? CODE_EXTENSIONS);

    return {
      name: `${name} (${desc})`,
      ...filesOptions,
      ...options,
    };
  };

  /**
   * @param {string} name
   * @param {PackageInfo[]} packages
   * @param {Omit<ConfigOptions, 'filter'>} [overrides]
   * @returns {InfiniteDepthConfigWithExtends}
   */
  #code(
    name,
    packages,
    { rules, extensions = CODE_EXTENSIONS, extends: extendsConfig = [], ...config } = {}
  ) {
    if (packages.length === 0) return [];

    return {
      ...config,
      name,
      ...this.#pkgFiles(packages, extensions),
      plugins: {
        ...javascript.plugins,
        ...typescript.plugins,
        ...config.plugins,
      },
      settings: {
        ...config.settings,
        node: {
          version: '22',
        },
      },
      extends: [...javascript.extends, ...extendsConfig],
      languageOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',

        parserOptions: {
          projectService: true,
          tsconfigRootDir: this.root,
        },
      },
      rules: {
        ...javascript.rules,
        ...typescript.rules,
        ...rules,
      },
    };
  }
}

export const workspace = WorkspaceConfig.root();
export const { code, override, compat } = workspace;
export const jsons = JSON_CONFIG;

const PKG_GLOBS = ['index', 'lib/**/*'];
const TEST_GLOBS = ['**/*'];
const CODE_EXTENSIONS = ['ts', 'js', 'mjs', 'mts'];

/**
 * @param {PackageQuery} someFilter
 * @returns {{filter: SomePackageFilter; matches: (pkg: PackageInfo) => boolean; operator: '=' | '!='; desc: string}}
 */
function parseFilter(someFilter) {
  const parsed = /^(?<filterName>[^!=]+)(?<operator>!?=)(?<param>.*)$/u.exec(someFilter);

  if (!parsed?.groups) {
    throw new Error(`Invalid filter: ${someFilter}`);
  }

  const { filterName, operator, param } =
    /** @type {{filterName: FilterName, operator: string, param: string}} */ (parsed.groups);

  if (!(filterName in filters)) {
    throw new Error(`Unknown filter: ${filterName} (expected one of ${Object.keys(filters)})`);
  }

  if (operator !== '=' && operator !== '!=') {
    throw new Error(`Invalid filter operator: ${operator} (expected '=' or '!=')`);
  }

  const filterFn = filters[filterName];

  const filter = filterFn(/** @type {never} */ (param));
  return {
    filter,
    operator,
    desc: filter.desc(param, operator),
    matches: (pkg) => (operator === '=' ? filter.matches(pkg) : !filter.matches(pkg)),
  };
}

/**
 * @param {PackageInfo} pkg
 * @param {PackageQuery} someFilter
 * @returns {boolean}
 */
function matches(pkg, someFilter) {
  const { filter, operator } = parseFilter(someFilter);
  const result = filter.matches(pkg);

  return operator === '=' ? result : !result;
}
