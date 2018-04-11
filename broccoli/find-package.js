'use strict';
const fs = require('fs');
const path = require('path');
const resolve = require('resolve');

const cache = new Map();

module.exports = function findPackage(name, from) {
  let key = from === void 0 ? name : name + '\0' + from;
  let info = cache.get(key);
  if (info === undefined) {
    let basedir = from === void 0 ? __dirname : findPackage(from).dir;
    let resolved = resolve.sync(name + '/package.json', {
      basedir: basedir,
    });
    info = new PackageInfo(fs.realpathSync(resolved));
    cache.set(key, info);
  }
  return info;
};

class PackageInfo {
  constructor(resovled) {
    let config = require(resovled);
    this.name = config.name;
    this.config = config;
    this.dir = path.dirname(resovled);
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
