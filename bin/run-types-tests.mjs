import { inspect } from 'node:util';

import { execSync } from 'child_process';
import { execa } from 'execa';
import yaml from 'js-yaml';
import { resolve } from 'path';

const __dirname = new URL('.', import.meta.url).pathname;
const root = resolve(__dirname, '..');

async function main() {
  const packages = getPackages().filter((pkg) => pkg.name !== '@glimmer/vm-babel-plugins');

  /**
   * Runs a smoke test of the generated type definitions by importing every module
   * and running it through the TypeScript compiler.
   */
  console.log('TAP version 14');
  console.log(`1..${packages.length}`);

  let testNo = 1;

  for (const pkg of packages) {
    try {
      console.log(`# Smoke testing ${pkg.name}`);
      await execa('tsc', ['-p', resolve(root, 'tsconfig.dist.json')], {
        cwd: resolve(pkg.path, 'dist'),
        preferLocal: true,
      });
      console.log(`ok ${testNo++} - ${pkg.name} types passed`);
    } catch (err) {
      let message = getMessage(err);
      console.log(`not ok ${testNo++} - types failed smoke test`);
      console.log(`  ---
    ${yaml.dump({ message })}
      ...`);

      process.exitCode = 1;
    }
  }
}

/**
 * @param {unknown} err
 * @returns {string | undefined}
 */
function getMessage(err) {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message;
  }
  return inspect(err);
}

main();

/** @typedef {{ name: string; version: string; path: string; main: string; private: boolean; }} PnpmPackage */

function getPackages() {
  /** @type {PnpmPackage[]} */
  const allPackages = JSON.parse(
    execSync(`pnpm -r ls --depth -1 --json`, { encoding: 'utf-8' }).trim()
  );

  return allPackages.filter((pkg) => pkg.private !== true && pkg.name !== '@glimmer/interfaces');
}
