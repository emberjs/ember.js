/**
 * Runs each bench script against two ember-source checkouts,
 * and prints one table.
 *
 * Run: node compare.js <before> <after>
 *
 * Each argument is an ember-source checkout with a built `dist/`
 * (`pnpm build`).
 */
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [before, after] = process.argv.slice(2).map((dir) => resolve(dir));

if (!before || !after) {
  console.error('Usage: node compare.js <before ember-source> <after ember-source>');
  process.exit(1);
}

const scripts = readdirSync(here).filter((file) => file.endsWith('.js') && file !== 'compare.js');

function runScript(script, emberSource) {
  let child = spawnSync(process.execPath, [resolve(here, script), '--json'], {
    env: { ...process.env, EMBER_SOURCE: emberSource },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  if (child.status !== 0) throw new Error(`${script} failed with ${emberSource}`);

  return JSON.parse(child.stdout.trim().split('\n').pop()).rows;
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function ms(ns) {
  return `${(ns / 1e6).toFixed(2)} ms`;
}

function percent(a, b) {
  let change = ((b - a) / a) * 100;

  return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
}

console.log(`before: ${before}\nafter:  ${after}\n`);
console.log(
  '| bench | heap before | heap after | change | time before | time after | retained before | retained after |'
);
console.log('|---|---|---|---|---|---|---|---|');

for (let script of scripts) {
  let a = runScript(script, before);
  let b = runScript(script, after);

  for (let i = 0; i < a.length; i++) {
    let x = a[i];
    let y = b[i];

    console.log(
      `| ${script}: ${x.name} | ${kb(x.heapBytes)} | ${kb(y.heapBytes)} | ${percent(x.heapBytes, y.heapBytes)} | ${ms(x.timeNs)} | ${ms(y.timeNs)} | ${Math.round(x.retainedBytes)} B | ${Math.round(y.retainedBytes)} B |`
    );
  }
}
