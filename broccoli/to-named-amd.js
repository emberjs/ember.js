const Babel = require('broccoli-babel-transpiler');
const resolveModuleSource = require('amd-name-resolver').moduleResolve;
const enifed = require('./transforms/transform-define');

module.exports = function processModulesOnly(tree, annotation) {
  let options = {
    plugins: [
      ['transform-es2015-modules-amd', { loose: true, noInterop: true }],
      enifed,
    ],
    moduleIds: true,
    resolveModuleSource,
    annotation,
  };

  return new Babel(tree, options);
};
