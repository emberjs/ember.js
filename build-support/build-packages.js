const buildPackage = require('@glimmer/build');
const funnel = require('broccoli-funnel');
const merge = require('broccoli-merge-trees');
const glob = require('glob');
const path = require('path');

const TSCONFIG_PATH = `${__dirname}/../build/tsconfig.json`;
const PACKAGES_PATH = `${__dirname}/../packages`;

module.exports = function() {
  let packageTrees = glob.sync(`${PACKAGES_PATH}/**/package.json`)
    .slice(0,1)
    .map(p => p.replace('/package.json', ''))
    .map(packagePath => treeForPackage(packagePath));

  return merge(packageTrees);
}

function treeForPackage(packagePath) {
  let tree = buildPackage({
    projectPath: packagePath,
    tsconfigPath: TSCONFIG_PATH
  });

  let destDir = path.relative(PACKAGES_PATH, packagePath);

  return funnel(tree, { destDir });
}