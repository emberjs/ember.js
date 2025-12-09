import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { styleText } from 'node:util';

import { execaCommand } from 'execa';

const WORKSPACE_ROOT = join(import.meta.dirname, '../../');
const NODE_SMOKE_DIR = join(WORKSPACE_ROOT, './smoke-tests/node');

function inRoot(cmd: string, options = {}) {
  return inDir(WORKSPACE_ROOT, cmd, options);
}

let asBin = false;

function log(msg: any) {
  if (asBin) {
    console.info(msg);
  }
}

function inDir(dir: string, cmd: string, options = {}) {
  log(styleText('gray', `in ${dir}:\n`) + styleText('green', '\t' + cmd));

  return execaCommand(cmd, {
    cwd: dir,
    preferLocal: true,
    shell: true,
    stdio: 'inherit',
    ...options,
  });
}

export function inNodeSmoke(cmd: string, options = {}) {
  return inDir(NODE_SMOKE_DIR, cmd, options);
}

export async function prepare() {
  //////////
  // build
  //   When turbo is set up with "dependsOn": "["^prepack"], we see these packages
  //   - @glimmer/syntax
  //   - @glimmer/util
  //   - @glimmer/wire-format
  //
  //   So these 3 packages need to be packed and installed
  await inRoot(`pnpm turbo prepack`);

  let manifestPath = join(WORKSPACE_ROOT, 'smoke-tests/node/package.json');
  let manifest = JSON.parse((await readFile(manifestPath)).toString());
  let deps = Object.keys(manifest.dependencies);

  //////////
  // install the tarballs using stable names so we don't have to
  //   dynamically build the package.json
  let pack = (out: string) => `pnpm pack --out ${join(NODE_SMOKE_DIR, 'packages', out)}.tgz`;

  for (let dep of deps) {
    await inDir(join(WORKSPACE_ROOT, `packages/${dep}`), pack(dep));
  }
}

if (process.argv[1] === import.meta.filename) {
  asBin = true;
  log(`Setting up smoke test packages`);
  log({ WORKSPACE_ROOT, NODE_SMOKE_DIR });

  await prepare();

  log(`Installing Deps`);
  await inNodeSmoke(`pnpm install --ignore-workspace`);

  log(`Done`);
}
