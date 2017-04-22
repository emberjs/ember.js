/* eslint-env node */
"use strict";

const path = require('path');

module.exports = function findLib(name, libPath) {
  let packagePath = path.join(name, 'package');
  let packageRoot = path.dirname(require.resolve(packagePath));

  libPath = libPath || getLibPath(packagePath);

  return path.resolve(packageRoot, libPath);
};

function getLibPath(packagePath) {
  let packageJson = require(packagePath);

  return path.dirname(packageJson['module'] || packageJson['main']);
}