import { Package } from '@glimmer-workspace/build-support';
import { execSync } from 'child_process';

const BUILD_PACKAGES = process.env.GLIMMER_BUILD_PACKAGES
  ? process.env.GLIMMER_BUILD_PACKAGES.split(',')
  : null;

export default getPackages()
  .filter((pkg) => {
    return BUILD_PACKAGES ? BUILD_PACKAGES.includes(pkg.name) : true;
  })
  .flatMap((pkg) => Package.config(pkg.path));

/** @typedef {{ name: string; version: string; path: string; main: string; private: boolean; }} PnpmPackage */

function getPackages() {
  /** @type {PnpmPackage[]} */
  const allPackages = JSON.parse(
    execSync(`pnpm -r ls --depth -1 --json`, { encoding: 'utf-8' }).trim()
  );

  return allPackages.filter((pkg) => pkg.private !== true && pkg.name !== '@glimmer/interfaces');
}
