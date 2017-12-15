"use strict";
const path = require('path');

const cache = new Map();

module.exports = function findPackage(name) {
  let info = cache.get(name);
  if (info === undefined) {
    info = new PackageInfo(name);
    cache.set(name, info);
  }
  return info;
};

class PackageInfo {
  constructor(name) {
    this.name = name;
    let pkgName = name + '/package';
    let config = require(pkgName);
    this.config = config;
    this.dir = path.dirname(require.resolve(pkgName));
  }

  get main() {
    return this.parseResolve(this.config.main);
  }

  get module() {
    return this.parseResolve(this.config.module);
  }

  get dependencies() {
    return this.config.dependencies && Object.keys(this.config.dependencies);
  }

  resolve(relative) {
    if (!relative) return;
    return path.resolve(this.dir, relative);
  }

  parseResolve(relative) {
    if (!relative) return;
    let resolved = this.resolve(relative);
    let parsed = path.parse(resolved);
    return {
      dir: parsed.dir,
      base: parsed.base,
      path: resolved,
    };
  }

}
