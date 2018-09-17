'use strict';

const Babel = require('broccoli-babel-transpiler');
const enifed = require('./transforms/transform-define');
const injectNodeGlobals = require('./transforms/inject-node-globals');
const { resolveRelativeModulePath } = require('./module-path-resolver');

module.exports = function processModulesOnly(tree, annotation) {
  let options = {
    plugins: [
      // ensures `@glimmer/compiler` requiring `crypto` works properly
      // in both browser and node-land
      injectNodeGlobals,
      ['module-resolver', { resolvePath: resolveRelativeModulePath }],
      ['@babel/transform-modules-amd', { noInterop: true, strict: true }],
      enifed,
    ],
    moduleId: true,
    annotation,
    inputSourceMap: false,
    sourceMaps: 'inline',
  };

  return new Babel(tree, options);
};
