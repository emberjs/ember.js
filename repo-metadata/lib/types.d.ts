/* eslint-disable no-irregular-whitespace */
import type { PackageEntryPoints } from 'pkg-entry-points';

export interface RepoMeta {
  /**
   * The TypeScript profile to use. This field controls the linting
   * configuration for this package.
   *
   * Currently, the `tsconfig.json` is the same for all packages. This is
   * intentional, as it allows us to avoid project references, which
   * significantly compilate matters.
   *
   * - `strict` enables `strictTypeChecked`.
   * - `loose` enables `recommendedTypeChecked`, but disables some safety rules,
   *   such as `no-explicit-any` and many `unsafe-*` rules. This is meant to be
   *   a temporary measure while we work on the strict mode migration.
   */
  strictness?: 'strict' | 'loose';
  /**
   * The list of file patterns to lint (without the extension).
   *
   * The default is:
   *
   * - for test packages, `**​/*`
   * - for other packages, `['index', 'src/**​/*']`
   *
   * Some special packages (such as `bin`) specify their own list.
   */
  lint?: string | string[];

  /**
   * The list of special environments used by this package.
   *
   * - `node`: this package will be used in a Node.js environment.
   * - `console`: this package will use console globals.
   * - `qunit`: this package will use QUnit globals.
   * - `decorator:classic`: this package will use classic decorators.
   */
  env?: RepoMetaEnv[];
}

type RepoMetaEnv = 'node' | 'console' | 'qunit' | 'decorator:classic';

export interface PackageInfo {
  name: string;
  root: string;
  type: 'module' | 'commonjs';
  private: boolean;
  entryPoints?: PackageEntryPoints;
  'repo-meta'?: {
    strictness?: 'strict' | 'loose';
    env?: RepoMetaEnv[];
    lint?: string[];
  };
}
