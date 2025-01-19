/* eslint-disable no-irregular-whitespace */
import type { PackageEntryPoints } from 'pkg-entry-points';

export interface RepoMeta {
  /**
   * Information about the workspace from `pnpm-workspace.yaml`.
   */
  workspace: {
    /**
     * The version of the root package, which is used as the version of non-published packages. In
     * principle, there is no reason why private packages **need** a version, but tooling sometimes
     * doesn't behave properly without one, and it's not a big deal to add one.
     *
     * > Even if a specific bug is fixed in the future, we should give the private packages a
     * > version unless we're very confident that the ecosystem works properly without one.
     *
     * @see https://github.com/pnpm/pnpm/issues/4164
     */
    version: string;
    packages: string[];
  };

  /**
   * A list of packages in the repository, in the `RepoMetaForPackage` format.
   */
  packages: PackageInfo[];
}

export interface RepoMetaForPackage {
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

  /**
   * Whether this package has buildable entry points and therefore needs to be built.
   */
  built?: true;
}

type RepoMetaEnv = 'node' | 'console' | 'qunit' | 'decorator:classic';

export interface PackageInfo {
  name: string;
  version: string | undefined;
  root: string;
  type: 'module' | 'commonjs';
  private: boolean;
  entryPoints?: PackageEntryPoints;
  'repo-meta'?: {
    strictness?: 'strict' | 'loose';
    env?: RepoMetaEnv[];
    lint?: string[];
    built: boolean;
  };
}
