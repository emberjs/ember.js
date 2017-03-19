const buildPackage = require('@glimmer/build');
const buildTestsIndex = require('@glimmer/build/lib/build-tests-index');
const funnel = require('broccoli-funnel');
const merge = require('broccoli-merge-trees');
const Filter = require('broccoli-persistent-filter');
const DAGMap = require('dag-map').default;
const glob = require('glob');
const path = require('path');
const fs = require('fs');

const TSCONFIG_PATH = `${__dirname}/../../build/tsconfig.json`;
const PACKAGES_PATH = `${__dirname}/../../packages`;

/**
 * Find all packages in `packages/` directory and build them individually.
 * Builds are ordered by inverting the dependency tree, so a package's
 * dependencies should be ready by the time it is built.
 */
module.exports = function() {
  // Topographically sort packages, then create a @glimmer/build tree per
  // package.
  let packageTrees = topsortPackages()
    .map(packagePath => treeForPackage(packagePath));

  // Merge all packages together, completing the build.
  return merge(packageTrees);
}

function topsortPackages() {
  // Find all packages in `packages/` that have a `package.json` file, and load
  // that `package.json`.
  let pkgs = glob
    .sync(`${PACKAGES_PATH}/**/package.json`)
    .map(pkgPath => require(pkgPath))
    // .filter(pkg => pkg.name === '@glimmer/util')
    .filter(pkg => pkg.name !== '@glimmer/interfaces');

  // Get a list of package names discovered in the repo.
  let inRepoDependencies = pkgs.map(pkg => pkg.name);

  let graph = new DAGMap();

  // For each package, get a list of in-repo packages it depends on, and add
  // them to the graph.
  pkgs
    .map(pkg => filterDependencies(pkg))
    .forEach(([pkg, deps]) => {
      graph.add(pkg.name, pkg, null, deps)
    });

  let sorted = [];

  // Get a topographically sorted list of packages.
  graph.each(pkg => sorted.push(`${PACKAGES_PATH}/${pkg}`));

  return sorted;

  function filterDependencies(pkg) {
    // Merge the package's dependencies and dev dependencies
    let dependencies = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {})
    ];

    // Filter out any dependencies that we didn't discover in the repo.
    dependencies = dependencies
      .filter(dep => inRepoDependencies.indexOf(dep) > -1);

    return [pkg, dependencies];
  }
}

/**
 * Returns a `@glimmer/build` Broccoli tree for a given path.
 *
 * @param {string} packagePath
 */
function treeForPackage(packagePath) {
  let srcTrees = [
    funnel(packagePath, { exclude: ['test/'] }),
  ];

  if (fs.readdirSync(`${packagePath}`).length > 0) {
    srcTrees.push(buildTestsIndex(`${packagePath}/test`, 'test/index.ts'));
  }

  let packageTree = buildPackage({
    srcTrees,
    projectPath: packagePath,
    tsconfigPath: TSCONFIG_PATH
  });

  let packageJSONTree = treeForPackageJSON(packagePath);

  let tree = merge([packageTree, packageJSONTree]);

  // Convert the package's absolute path to a relative path so it shows up in
  // the right place in `dist`.
  let destDir = path.relative(PACKAGES_PATH, packagePath);

  return funnel(tree, { destDir });
}

const PACKAGE_JSON_FIELDS = {
  "main": "commonjs/es5/index.js",
  "jsnext:main": "modules/es5/index.js",
  "module": "modules/es5/index.js",
  "typings": "types/index.d.ts"
};

class PackageJSONRewriter extends Filter {
  canProcessFile(relativePath) {
    return relativePath === 'package.json';
  }

  processString(string, relativePath) {
    let pkg = JSON.parse(string);
    Object.assign(pkg, PACKAGE_JSON_FIELDS);
    return JSON.stringify(pkg, null, 2);
  }
}

function treeForPackageJSON(packagePath) {
  let packageJSONTree = funnel(packagePath, {
    include: ['package.json']
  });

  return new PackageJSONRewriter(packageJSONTree);
}