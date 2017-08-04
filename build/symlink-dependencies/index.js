'use strict';

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf').sync;

const Project = require('../utils/project');

const OUTPUT_PATH = 'dist/';

/**
 * Ember CLI addon that symlinks cross-package dependencies. This makes it much
 * easier to test and `npm link` packages locally before they are published.
 *
 * This is implemented using an addon because there's no hook in Broccoli itself
 * to run some code *after* a build has finished. Additionally, Ember CLI uses
 * tree-sync to efficiently copy the output from Broccoli's tmp directory to
 * dist. Unfortunately, these optimizations are incompatible with symlinks (it
 * can't handle circular links) so the symlinking must happen after the build
 * process has finished.
 */
module.exports = {
  name: 'symlink-dependencies',

  preBuild() {
    rimraf('dist/@glimmer/*/node_modules');
  },

  outputReady() {
    Project.from('packages')
      .packages
      .forEach(symlinkDependencies);
  }
}

function symlinkDependencies(pkg) {
  let name = pkg.name;
  let modulesPath = path.join(OUTPUT_PATH, name, 'node_modules');
  let dependencies = pkg.dependencies || {};

  // @glimmer/test-helpers has some tricky circular dependencies so we manually
  // link it into every package locally.
  if (name !== '@glimmer/test-helpers') {
    dependencies['@glimmer/test-helpers'] = true;
  }

  for (let dep in dependencies) {
    if (isScopedPackage(dep)) { mkdirpScope(dep); }

    trySymlink(dep, name, modulesPath);
  }
}

function trySymlink(dep, pkgName, modulesPath) {
  try {
    fs.symlinkSync(
      path.join('../../../../', dep),
      path.join(modulesPath, dep)
    );
  } catch (e) {
    console.warn(`Error symlinking dependency '${dep}' for package '${pkgName}'.`);
  }
}

function mkdirpScope(pkgName) {
  let scope = pkgName.split('/')[0];
  mkdirp.sync(path.join(OUTPUT_PATH, scope));
}

function isScopedPackage(pkgName) {
  return pkgName.charAt(0) === '@';
}
