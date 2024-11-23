/** @import { PackageInfo } from './lib/types'; */
import { resolve } from 'node:path';

export { default } from './metadata.json' with { type: 'json' };

export const WORKSPACE_ROOT = resolve(import.meta.dirname, '..');
export const BENCHMARK_ROOT = resolve(WORKSPACE_ROOT, 'benchmark/benchmarks/krausest');
