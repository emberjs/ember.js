#!/usr/bin/env node

// This script fetches the npm owners of the root package (glimmer-engine) and
// makes them owners of all of individual subpackages. Note that the script will
// add new people, but won't remove anyone who has been removed from
// glimmer-engine.

const execSync = require('child_process').execSync;
const globSync = require('glob').sync;

let name = require('../package.json').name;

console.log("Looking for existing owners on " + name + " on npm...");

let owners = execSync('npm owner ls')
  .toString()
  .split('\n')
  .filter(line => line.trim())
  .map(line => line.split(' ')[0]);

console.log(owners.map(o => `✅  ${o}`).join('\n'));

console.log("\nLooking for packages...");

let packages = globSync('@glimmer/*/package.json', {
  cwd: __dirname + '/../dist'
}).map(package => package.replace('/package.json', ''));

if (!packages.length) {
  console.log("No packages found. Did you do a build first?");
  process.exit(1);
}

console.log(packages.join('\n') + '\n');

owners.forEach(owner => {
  packages.forEach(package => {
    console.log(`Adding ${owner} to ${package}...`);
    execSync(`npm owner add "${owner}" "${package}"`);
  });
});

console.log('\nDone.');