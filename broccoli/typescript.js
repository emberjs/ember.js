'use strict';

const resolve = require('resolve');
const path = require('path');

// our typescript version comes from a dependency in
// broccoli-typescript-compiler, so we look typescript up
// from there...
let broccoliTypescriptCompilerRoot = path.dirname(
  resolve.sync('broccoli-typescript-compiler/package.json'),
  { basedir: __dirname }
);
let typescriptEntryPoint = resolve.sync('typescript', {
  basedir: broccoliTypescriptCompilerRoot,
});

module.exports = require(typescriptEntryPoint);
