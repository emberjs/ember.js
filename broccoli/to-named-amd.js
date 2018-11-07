const Babel = require('broccoli-babel-transpiler');
const resolveModuleSource = require('amd-name-resolver').moduleResolve;
const enifed = require('./transforms/transform-define');
const injectNodeGlobals = require('./transforms/inject-node-globals');

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
      ['transform-es2015-modules-amd', transformOptions],
      enifed,
    ],
    moduleIds: true,
    resolveModuleSource,
  };

  return new Babel(tree, options);
};
