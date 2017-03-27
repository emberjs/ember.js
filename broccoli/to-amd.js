'use strict';
/* eslint-env node */

const resolveModuleSource = require('amd-name-resolver').moduleResolve;
const Babel = require('broccoli-babel-transpiler');
const enifed = require('./transforms/transform-define');
const stripClassCallCheck = require('./transforms/strip-class-call-check');
const injectNodeGlobals = require('./transforms/inject-node-globals');

module.exports = function toAmd(tree, _options) {
  let options = Object.assign({
    environment: 'development'
  }, _options);
  options.moduleIds = true;
  options.resolveModuleSource = resolveModuleSource;
  options.sourceMap = 'inline';
  options.plugins = [
    injectNodeGlobals,
    ['transform-es2015-modules-amd', { noInterop: true, strict: true }],
    enifed
  ];

  if (options.environment === 'production') {
    options.plugins.unshift([stripClassCallCheck, { source: 'ember-babel' }]);
  }

  delete options.environment;

  return new Babel(tree, options);
}