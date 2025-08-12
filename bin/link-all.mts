/**
 * This script prepares all @glimmer packages for local testing against ember.js.
 *
 * It performs the following steps:
 * 1. Packs all @glimmer packages into tarballs (similar to npm pack)
 * 2. Extracts them into a dist/ directory with proper structure
 * 3. Creates a temporary pnpm workspace with all the packages
 * 4. Globally links each package so they can be used by ember.js
 *
 * This allows testing Glimmer VM changes in ember.js without publishing to npm.
 * The ember.js build can then use `pnpm link --global <package>` to use these
 * local versions instead of the published npm packages.
 *
 * Usage: pnpm link:all
 * To undo: pnpm unlink:all
 */

import { writeFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import chalk from 'chalk';
import { execa } from 'execa';
import { mkdirp } from 'mkdirp';
import { rimraf } from 'rimraf';
import { x as untar } from 'tar';

import { packages } from './packages.mts';

const dist = new URL('../dist', import.meta.url).pathname;
const pkgs = packages('@glimmer');

await mkdirp(dist);
await rimraf(dist + '/*.tgz', { glob: true });

const pack = pkgs.map(async (pkg) => {
  try {
    await execa('pnpm', ['pack', '--pack-destination', dist], {
      cwd: pkg.path,
    });

    console.log(chalk.green(`Successfully packed ${pkg.name}`));
  } catch (error: unknown) {
    let message = `Failed to pack ${pkg.name}`;

    if (error instanceof Error) {
      message += `\n\n${error.stack}`;
    }

    throw new Error(message);
  }
});

await Promise.all(pack);

const unpack = pkgs.map(async (pkg) => {
  try {
    const pkgDest = join(dist, pkg.name);

    await mkdirp(pkgDest);
    await rimraf(pkgDest + '/**/*');

    const tarball = join(dist, pkg.name.replace('@', '').replace('/', '-') + `-${pkg.version}.tgz`);

    await untar({
      file: tarball,
      strip: 1,
      cwd: pkgDest,
    });

    // https://github.com/pnpm/pnpm/issues/881
    const packageJsonPath = join(pkgDest, 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, { encoding: 'utf8' }));
    delete packageJson.devDependencies;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), {
      encoding: 'utf8',
    });

    console.log(chalk.green(`Successfully unpacked ${pkg.name}`));
  } catch (error: unknown) {
    let message = `Failed to unpack ${pkg.name}`;

    if (error instanceof Error) {
      message += `\n\n${error.stack}`;
    }

    throw new Error(message);
  }
});

await Promise.all(unpack);

const packageJson = `{
  "name": "glimmer-vm",
  "private": true,
  "overrides": {
${pkgs.map((pkg) => `    "${pkg.name}": "workspace:*"`).join(',\n')}
  }
}
`;

const workspaceYaml = 'packages:\n' + pkgs.map((pkg) => `  - '${pkg.name}'\n`).join('');

await writeFile(join(dist, 'package.json'), packageJson, { encoding: 'utf8' });
await writeFile(join(dist, 'pnpm-workspace.yaml'), workspaceYaml, { encoding: 'utf8' });

await execa('pnpm', ['install'], {
  cwd: dist,
  stdio: 'inherit',
});

console.log(chalk.green(`Successfully installed packages`));

// Seems like there are race conditions in pnpm if we try to do these concurrently
for (const pkg of pkgs) {
  try {
    const pkgDest = join(dist, pkg.name);

    await execa('pnpm', ['link', '--global'], {
      cwd: pkgDest,
    });

    console.log(chalk.green(`Successfully linked ${pkg.name}`));
  } catch (error: unknown) {
    let message = `Failed to link ${pkg.name}`;

    if (error instanceof Error) {
      message += `\n\n${error.stack}`;
    }

    throw new Error(message);
  }
}
