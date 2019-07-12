'use strict';

const Babel = require('broccoli-babel-transpiler');
const buildDebugMacroPlugin = require('../lib/build-debug-macro-plugin');

module.exports = function debugMacros(tree, environment) {
  let isDebug = environment !== 'production';

  let plugins = [buildDebugMacroPlugin(isDebug)];

  return new Babel(tree, { plugins });
};
