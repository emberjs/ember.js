import * as benchmark from './lib/bench-init';
import * as stats from './lib/stats';
import suites from './lib/bench-suites';
import { BenchmarkScenario } from './lib/bench';

export const Benchmark = benchmark;
export const Stats = stats;
export const Suites: {
  [suiteName: string]: typeof BenchmarkScenario[];
} = suites;
