'use strict';

const Babel = require('broccoli-babel-transpiler');
const enifed = require('./transforms/transform-define');
const injectNodeGlobals = require('./transforms/inject-node-globals');
const { resolveRelativeModulePath } = require('./module-path-resolver');

module.exports = function processModulesOnly(tree, strict = false) {
  let transformOptions = { noInterop: true };

  // These options need to be exclusive for some reason, even the key existing
  // on the options hash causes issues.
  if (strict) {
    transformOptions.strict = true;
  } else {
    transformOptions.loose = true;
  }

  let options = {
    sourceMap: true,
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
