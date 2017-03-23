"use strict";

const fs = require('fs');
const glob = require('glob');
const path = require('path');

class Package {
  constructor(absolutePath, siblingPackages) {
    this.absolutePath = absolutePath;
    this.siblingPackages = siblingPackages;
    this.pkg = require(this.packageJSONPath);
  }

  get name() {
    return this.pkg.name;
  }

  get version() {
    return this.pkg.version;
  }

  get relativePath() {
    return path.relative(process.cwd(), this.absolutePath);
  }

  get packageJSONPath() {
    return path.join(this.absolutePath, 'package.json');
  }

  updateDependencies(newVersion) {
    this._updateDependencies(this.pkg.dependencies, newVersion);
    this._updateDependencies(this.pkg.devDependencies, newVersion);
  }

  _updateDependencies(deps, newVersion) {
    if (!deps) { return; }

    Object.keys(deps).forEach(dep => {
      if (this.siblingPackages.indexOf(dep) >= 0) {
        deps[dep] = `^${newVersion}`;
      }
    });
  }

  savePackageJSON() {
    fs.writeFileSync(this.packageJSONPath, JSON.stringify(this.pkg, null, 2));
  }
}

function findPackages(cwd) {
  // Search for packages one level deep, including scoped packages that are
  // nested in a @scope directory.
  let packages = glob.sync('{@*/,}*/package.json', { cwd })
    .map(pkg => path.dirname(pkg)); // Remove package.json from path

  if (!packages.length) { throwNoPackagesErr(); }

  return packages
    .map(pkg => path.resolve(cwd, pkg)) // Ensure path is absolute
    .map(pkg => new Package(pkg, packages));
}

module.exports = {
  Package,
  findPackages
}
