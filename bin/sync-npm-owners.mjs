// This script fetches the npm owners of the root package (glimmer-engine) and
// makes them owners of all of individual subpackages. Note that the script will
// add new people, but won't remove anyone who has been removed from
// glimmer-engine.

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { globSync } from 'glob';

const __dirname = new URL('.', import.meta.url).pathname;
const manifest = resolve(__dirname, '../package.json');
let name = JSON.parse(readFileSync(manifest)).name;

console.log('Looking for existing owners on ' + name + ' on npm...');

let owners = execSync('npm owner ls')
  .toString()
  .split('\n')
  .filter((line) => line.trim())
  .map((line) => line.split(' ')[0]);

console.log(owners.map((o) => `✅  ${o}`).join('\n'));

console.log('\nLooking for packages...');

let packages = globSync('@glimmer/*/package.json', {
  cwd: __dirname + '/../dist',
}).map((pkg) => pkg.replace('/package.json', ''));

if (!packages.length) {
  console.log('No packages found. Did you do a build first?');
  // eslint-disable-next-line n/no-process-exit
  process.exit(1);
}

console.log(packages.join('\n') + '\n');

owners.forEach((owner) => {
  packages.forEach((pkg) => {
    console.log(`Adding ${owner} to ${pkg}...`);
    execSync(`npm owner add "${owner}" "${pkg}"`);
  });
});

console.log('\nDone.');
