/**
 * Measures how much heap one iteration allocates, and how much it keeps.
 *
 * mitata runs a full GC before each iteration and reads the heap around it.
 * The heap function reads only `used_heap_size`.
 * mitata's default also adds `malloced_memory`, which moves by about 1.5 MB
 * when V8 compiles code, and that hides the change we want to see.
 */
import { getHeapStatistics } from 'node:v8';
import { measure as mitataMeasure } from 'mitata';

import { emberSource } from './setup.js';

const JSON_OUTPUT = process.argv.includes('--json');
const RETAINED_ITERATIONS = 2000;

const benches = [];

/**
 * @param {string} name
 * @param {() => void} fn one iteration. It must leave the app as it found it,
 *   so that iterations can repeat without limit.
 */
export function measure(name, fn) {
  benches.push({ name, fn });
}

function heapUsed() {
  return getHeapStatistics().used_heap_size;
}

/**
 * The heap growth over many iterations, after a full GC.
 * A number near zero means that the iterations keep nothing alive.
 */
function retained(fn) {
  fn();
  globalThis.gc();

  let before = heapUsed();

  for (let i = 0; i < RETAINED_ITERATIONS; i++) fn();

  globalThis.gc();

  return (heapUsed() - before) / RETAINED_ITERATIONS;
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export async function runBenches() {
  let rows = [];

  for (let { name, fn } of benches) {
    let stats = await mitataMeasure(fn, {
      gc: globalThis.gc,
      inner_gc: true,
      heap: heapUsed,
    });

    rows.push({
      name,
      timeNs: stats.p50,
      heapBytes: stats.heap.avg,
      retainedBytes: retained(fn),
    });
  }

  if (JSON_OUTPUT) {
    process.stdout.write(JSON.stringify({ emberSource, rows }) + '\n');
    return;
  }

  console.log(`ember-source: ${emberSource}\n`);

  for (let row of rows) {
    console.log(row.name);
    console.log(`  allocated per iteration: ${kb(row.heapBytes)}`);
    console.log(`  retained per iteration:  ${Math.round(row.retainedBytes)} B`);
    console.log(`  time per iteration:      ${(row.timeNs / 1e6).toFixed(2)} ms\n`);
  }
}
