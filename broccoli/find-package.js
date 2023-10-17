'use strict';
const { PackageCache } = require('@embroider/shared-internals');
const path = require('path');

const packageCache = PackageCache.shared('ember-source', __dirname);

exports.findFromProject = function findFromProject(...names) {
  let current = packageCache.get(packageCache.appRoot);
  for (let name of names) {
    current = packageCache.resolve(name, current);
  }
  return current;
};

exports.entrypoint = function moduleEntrypoint(pkg, which) {
  let module = pkg.packageJSON[which];
  if (!module) {
    return;
  }
  let resolved = path.resolve(pkg.root, module);
  let { dir, base } = path.parse(resolved);
  return {
    dir,
    base,
    path: resolved,
  };
};
