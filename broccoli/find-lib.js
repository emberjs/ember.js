/* eslint-env node */
"use strict";
const path = require('path');
const findPackage = require('./find-package');

module.exports = function findLib(name, libPath) {
  let pkg = findPackage(name);
  return pkg.resolve(libPath) || (pkg.module || pkg.main).dir;
};
