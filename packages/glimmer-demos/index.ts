import * as uptime from "./lib/uptime";
import * as dbmon from "./lib/dbmon";
import * as conways from "./lib/conways";
import * as ripples from "./lib/ripples";
import * as visualizer from "./lib/visualizer";
import * as stats from "./lib/stats";
import * as benchmark from "./lib/bench-init";
import suites from './lib/bench-suites';

export const UptimeDemo = uptime;
export const Dbmon = dbmon;
export const RipplesDemo = ripples;
export const ConwaysDemo = conways;
export const Visualizer = visualizer;
export const Benchmark = benchmark;
export const Stats = stats; // TODO does this belong in demos?
export const Suites = suites;
