'use strict';

/*
 * Utilities for working with Glimmer VM's subpackages.
 */

const fs = require('fs');
const glob = require('glob');
const path = require('path');
const DAGMap = require('dag-map').default;

/**
 * The Package class represents a logical subpackage in the Glimmer VM monorepo.
 * It contains utility methods for querying and rewriting a package's
 * `package.json` file.
 */
class Package {
  constructor(name, cwd, siblingPackages) {
    this.name = name;
    this.absolutePath = path.resolve(cwd, name);
    this.siblingPackages = siblingPackages;
    try {
      this.pkg = require(this.packageJSONPath);
    } catch (e) {
      this.pkg = { name };
    }
  }

  get version() {
    return this.pkg.version;
  }

  get private() {
    return this.pkg.private;
  }

  get relativePath() {
    return path.relative(process.cwd(), this.absolutePath);
  }

  get allDependencies() {
    return Object.assign({}, this.pkg.devDependencies, this.pkg.dependencies);
  }

  /**
   * The list of a package's dependencies that are internal to the same
   * monorepo.
   */
  get internalDependencies() {
    let siblings = this.siblingPackages;
    return Object.keys(this.allDependencies)
      .filter(dep => siblings.includes(dep));
  }

  get packageJSONPath() {
    return path.join(this.absolutePath, 'package.json');
  }

  get isPublishable() {
    return !this.pkg.private;
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

const PACKAGES_GLOB = '@glimmer/*/';

function findPackages(cwd, packagesGlob = PACKAGES_GLOB) {
  let packageNames = glob.sync(packagesGlob, { cwd })
    .map(trimTrailingSlash);

  if (!packageNames.length) { throw new Error(`No packages found in ${cwd}`); }

  let packages = packageNames.map(pkg => new Package(pkg, cwd, packageNames));

  return topsort(packages);
}

function trimTrailingSlash(filePath) {
  return filePath.replace(/\/$/, '');
}

function topsort(packages) {
  let graph = new DAGMap();

  // Get a list of package names discovered in the repo.
  let inRepoDependencies = packages.map(pkg => pkg.name);

  // For each package, get a list of in-repo packages it depends on, and add
  // them to the graph.
  packages
    .map(pkg => filterDependencies(pkg))
    .forEach(([pkg, deps]) => {
      graph.add(pkg.name, pkg, null, deps)
    });

  let sorted = [];

  // Get a topographically sorted list of packages.
  graph.each((pkgName, pkg) => sorted.push(pkg));

  return sorted;

  function filterDependencies(pkg) {
    // Merge the package's dependencies and dev dependencies, then filter out
    // any dependencies that we didn't discover in the repo.
    let dependencies = Object.keys(pkg.allDependencies)
      .filter(dep => inRepoDependencies.indexOf(dep) > -1);

    return [pkg, dependencies];
  }
}

const PROJECT_CACHE = [];

/**
 * Represents all of the packages in the monorepo project.
 */
class Project {

  /**
   * Use the static `from()` method to share a cached Project across multiple
   * consumers, so long as the root path is the same.
   */
  static from(rootPath) {
    let absolutePath = path.resolve(rootPath);
    if (PROJECT_CACHE[absolutePath]) {
      return PROJECT_CACHE[absolutePath];
    }

    return PROJECT_CACHE[absolutePath] = new Project(rootPath);
  }

  constructor(rootPath) {
    this.packages = findPackages(rootPath);
  }

  /**
   * Returns an array of dependencies and devDependencies for every package.
   */
  get dependencies() {
    let deps = [];

    this.packages.forEach(pkg => {
      deps.push(...Object.keys(pkg.allDependencies));
    });

    // Deduplicate dependencies
    return [...new Set(deps)];
  }
}

module.exports = Project;