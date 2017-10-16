'use strict';

const path = require('path');
const Filter = require('broccoli-persistent-filter');
const funnel = require('broccoli-funnel');
const UnwatchedDir = require('broccoli-source').UnwatchedDir;

const PACKAGE_JSON_FIELDS = {
  "main": "dist/commonjs/es5/index.js",
  "jsnext:main": "dist/modules/es5/index.js",
  "module": "dist/modules/es2017/index.js",
  "typings": "dist/types/index.d.ts",
  "license": "MIT"
};

class PackageJSONWriter extends Filter {
  canProcessFile(relativePath) {
    return path.basename(relativePath) === 'package.json';
  }

  processString(string) {
    let pkg = JSON.parse(string);
    Object.assign(pkg, PACKAGE_JSON_FIELDS);
    return JSON.stringify(pkg, null, 2);
  }
}

module.exports = function rewritePackageJSON(pkgName) {
  let tree = funnel(new UnwatchedDir('packages'), {
    include: [`${pkgName}/package.json`]
  });

  return new PackageJSONWriter(tree);
}
