'use strict';

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf').sync;

const Project = require('../utils/project');

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

  outputReady(results) {
    let outputPath = process.env.EMBER_CLI_TEST_OUTPUT || 'dist';

    Project.from('packages')
      .packages
      .forEach(symlinkDependencies);

    // For a given package, enumerate its internal dependencies (other packages in
    // the repo) and symlink them into the appropriate spot in `node_modules`.
    function symlinkDependencies(pkg) {
      let name = pkg.name;
      let modulesPath = path.join(outputPath, name, 'node_modules');
      let dependencies = pkg.internalDependencies;

      // @glimmer/test-helpers has some tricky circular dependencies so we manually
      // link it into every package locally.
      if (name !== '@glimmer/test-helpers') {
        dependencies.push('@glimmer/test-helpers');
      }

      dependencies.forEach(dep => {
        if (isScopedPackage(dep)) { mkdirpScope(dep, modulesPath); }
        fs.symlinkSync(
          path.join('../../../../', dep),
          path.join(modulesPath, dep)
        );
      });
    }
  }
}

function mkdirpScope(pkgName, modulesPath) {
  let scope = pkgName.split('/')[0];
  mkdirp.sync(path.join(modulesPath, scope));
}

function isScopedPackage(pkgName) {
  return pkgName.charAt(0) === '@';
}
