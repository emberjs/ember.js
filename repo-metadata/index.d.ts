import type { PackageInfo, RepoMeta } from './lib/types';
export type * from './lib/types';
declare const DEFAULT: RepoMeta;
export default DEFAULT;

/**
 * This is the root directory of the workspace as an _absolute_ path.
 * It's not included in `metadata.json` because it's different on each
 * computer, while the contents of `metadata.json` are _relative_ to the
 * workspace root, and therefore the same across machines.
 */
export const WORKSPACE_ROOT: string;

export type { PackageEntryPoints } from 'pkg-entry-points';

/**
 * This package is not a workspace package, since it's used as a standalone
 * benchmark in both the current (experiment) scenario and the control (`main`)
 * scenario.
 */
export const BENCHMARK_ROOT: string;

export function getPackageInfo(packageName: string): PackageInfo | undefined;

export function isRoot(pkg: PackageInfo): boolean;
