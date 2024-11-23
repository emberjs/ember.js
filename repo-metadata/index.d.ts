import type { PackageInfo } from './lib/types';
export type * from './lib/types';
declare const DEFAULT: PackageInfo[];
export default DEFAULT;
export const WORKSPACE_ROOT: string;

/**
 * This package is not a workspace package, since it's used as a standalone
 * benchmark in both the current (experiment) scenario and the control (`main`)
 * scenario.
 */
export const BENCHMARK_ROOT: string;
