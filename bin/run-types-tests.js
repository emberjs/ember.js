#!/usr/bin/env node

const execa = require('execa');
const chalk = require('chalk');
const yaml = require('js-yaml');

/**
 * Runs a smoke test of the generated type definitions by importing every module
 * and running it through the TypeScript compiler.
 */
try {
  console.log('TAP version 13');
  console.log('1..1');
  console.log('# Smoke testing types');
  execa.sync('tsc', ['--noEmit', '--target', 'ES2015', '--module', 'commonjs', 'dist/types-smoke-test.ts']);
  console.log('ok 1 - types passed smoke test');
} catch (err) {
  let { message } = err;
  console.log('not ok 1 - types failed smoke test');
  console.log(`  ---
${yaml.safeDump({ message })}
  ...`);

  process.exit(1);
}
