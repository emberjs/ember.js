'use strict';

const { findFromProject, entrypoint } = require('./find-package');
const path = require('path');

module.exports = function findLib(names, libPath) {
  let pkg = findFromProject(...names);

  if (libPath) {
    let resolved = path.resolve(pkg.root, libPath);
    if (resolved) {
      return resolved;
    }
  }

  let pkgModule = entrypoint(pkg, 'module');
  if (pkgModule) {
    return pkgModule.dir;
  }

  let pkgMain = entrypoint(pkg, 'main');
  if (pkgMain) {
    return pkgMain.dir;
  }
};
