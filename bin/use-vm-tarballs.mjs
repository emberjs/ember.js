/**
 * Scans the root folder and sets overrides
 * for the package.json
 *
 * This script exists temporarily while when work on merging
 * the glimmer-vm repo in to this one.
 *
 * Once the merge happens, we should delete this file.
 */
import fs from 'node:fs/promises';
import { join } from 'node:path';
import * as glob from 'glob';

const tgzs = glob.default.sync('*.tgz', { ignore: 'node_modules/**' });

const PARSE = /glimmer-(?<name>.+)-(?<version>(\d+\.?)+)\.tgz/;

const overrides = {};

for (let file of tgzs) {
  let match = file.match(PARSE);
  let { name } = match.groups;

  overrides[`@glimmer/${name}`] = `file:./${file}`;
}

let manifestPath = join(process.cwd(), 'package.json');
let manifestBuffer = await fs.readFile(manifestPath);
let manifest = JSON.parse(manifestBuffer.toString());

manifest.pnpm ||= {};
manifest.pnpm.overrides ||= {};

Object.assign(manifest.pnpm.overrides, overrides);

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
