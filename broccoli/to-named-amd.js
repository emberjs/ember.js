const Babel = require('broccoli-babel-transpiler');
const {
  resolveRelativeModulePath,
  getRelativeModulePath,
} = require('ember-cli-babel/lib/relative-module-paths');

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
    sourceMaps: true,
    plugins: [
      ['module-resolver', { resolvePath: resolveRelativeModulePath }],
      ['@babel/transform-modules-amd', transformOptions],
    ],
    moduleIds: true,
    getModuleId: getRelativeModulePath,
  };

  return new Babel(tree, options);
};
