const Babel = require('broccoli-babel-transpiler');
const resolveModuleSource = require('amd-name-resolver').moduleResolve;
const enifed = require('./transforms/transform-define');
const injectNodeGlobals = require('./transforms/inject-node-globals');

module.exports = function processModulesOnly(tree, annotation) {
  let options = {
    plugins: [
      // ensures `@glimmer/compiler` requiring `crypto` works properly
      // in both browser and node-land
      injectNodeGlobals,
      ['transform-es2015-modules-amd', { loose: true, noInterop: true }],
      enifed
    ],
    moduleIds: true,
    resolveModuleSource,
    annotation
  };

  return new Babel(tree, options);
};
