const fs = require('fs');
const path = require('path');
const glob = require('glob');
const mkdirp = require('mkdirp');
const Plugin = require('broccoli-plugin');

const DEFAULT_PACKAGE_JSON = {
  main: './index.js',
  module: './index.js',
  license: 'MIT',
};

/**
 * Broccoli plugin that generates a package.json file for each subpackage, as
 * well as any necessary package.json files for nested entry points.
 */
module.exports = class PackageJSONWriter extends Plugin {
  constructor(inputNode) {
    super([inputNode]);
  }

  /**
   * Each time the plugin builds, discover the npm packages in the input tree
   * and generate their package.json files.
   */
  build() {
    let packages = this.discoverPackages();

    packages.forEach(packageName => {
      this.writeMainPackageJson(packageName);
      this.discoverEntryPoints(packageName).forEach(entryPoint => {
        this.writeEntryPointPackageJson(packageName, entryPoint);
      });
    });
  }

  /**
   * Find all packages and scoped packages at the root of the input tree.
   */
  discoverPackages() {
    return this.glob('{!(@*),@*/*}/');
  }

  /**
   * Find any nested entry points (i.e. modules that are accessed other than the
   * root package name). For example, `@ember/object/computed` is a nested entry
   * point of `@ember/object`.
   *
   * To discover nested entry points, we search for any non-standard directories
   * and files in the package root. Files that should not be considered an entry
   * point should be placed inside the `lib/` directory.
   *
   */
  discoverEntryPoints(packageName) {
    let files = this.glob(`${packageName}/!(index).js`)
      .map(file => path.basename(file, '.js'))
      .map(file => [file, true]);
    let directories = this.glob(`${packageName}/!(lib|tests)/`)
      .map(file => path.basename(file))
      .map(file => [file, false]);

    return [...files, ...directories];
  }

  glob(globStr) {
    return glob.sync(globStr, { cwd: this.inputPaths[0] });
  }

  writeMainPackageJson(packagePath) {
    let packageJson = this.tryReadPackageJson(packagePath);
    Object.assign(packageJson, DEFAULT_PACKAGE_JSON);

    let packageJsonPath = path.join(this.outputPath, packagePath, 'package.json');
    mkdirp.sync(path.dirname(packageJsonPath));
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  writeEntryPointPackageJson(packageName, [entryPoint, isFile]) {
    let entryPointPath = path.join(packageName, entryPoint);

    let packageJson = {
      name: entryPointPath,
      module: isFile ? `../${entryPoint}.js` : `../${entryPoint}/index.js`,
    };

    this.writePackageJson(entryPointPath, packageJson);
  }

  writePackageJson(packagePath, packageJson) {
    let packageJsonPath = path.join(this.outputPath, packagePath, 'package.json');
    mkdirp.sync(path.dirname(packageJsonPath));
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  /**
   * Returns the package.json of the specified directory. If it doesn't exist,
   * returns an empty object.
   * @param {string} packagePath
   */
  tryReadPackageJson(packagePath) {
    let packageJsonPath = path.join(this.inputPaths[0], packagePath, 'package.json');
    try {
      let data = fs.readFileSync(packageJsonPath);
      return JSON.parse(data.toString());
    } catch (e) {
      return {};
    }
  }
};
