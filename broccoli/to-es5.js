'use strict';
/* eslint-env node */

const Babel = require('broccoli-babel-transpiler');
const injectBabelHelpers = require('./transforms/inject-babel-helpers');
const injectNodeGlobals = require('./transforms/inject-node-globals');
const enifed = require('./transforms/transform-define');
const { RELEASE, DEBUG, toConst } = require('./features');
const stripClassCallCheck = require('./transforms/strip-class-call-check');
const resolveModuleSource = require('amd-name-resolver').moduleResolve;

module.exports = function toES5(tree, _options) {
  let options = Object.assign({
    environment: 'developement'
  }, _options);
  options.moduleIds = true;
  options.resolveModuleSource = resolveModuleSource;
  options.sourceMap = true;
  options.plugins = [
    injectBabelHelpers,
    ['debug-macros', {
      debugTools: {
        source: 'ember-debug'
      },
      envFlags: {
        source: 'ember-env-flags',
        flags: { DEBUG: options.environment !== 'production' }
      },
      features: {
        name: 'ember-source',
        source: 'ember/features',
        flags: options.environment === 'production' ? toConst(RELEASE) : toConst(DEBUG)
      },
      externalizeHelpers: {
        module: true
      }
    }],
    ['transform-es2015-template-literals', {loose: true}],
    ['transform-es2015-arrow-functions'],
    ['transform-es2015-destructuring', {loose: true}],
    ['transform-es2015-spread', {loose: true}],
    ['transform-es2015-parameters'],
    ['transform-es2015-computed-properties', {loose: true}],
    ['transform-es2015-shorthand-properties'],
    ['transform-es2015-block-scoping'],
    ['check-es2015-constants'],
    ['transform-es2015-classes', { loose: true }],
    ['transform-proto-to-assign'],
    injectNodeGlobals,
    ['transform-es2015-modules-amd', { noInterop: true, strict: true }],
    enifed
  ];

  if (options.transformDefine) {
    options.plugins = [enifed];
    delete options.transformDefine;
  }

  if (options.transformModules === false) {
    options.plugins.pop();
    options.plugins.pop();
    delete options.moduleIds;
    delete options.resolveModuleSource;
    delete options.transformModules;
  }

  if (options.inlineHelpers) {
    options.plugins.shift();
    delete options.inlineHelpers;
  }

  delete options.environment;

  return new Babel(tree, options);
}

function stripForProd(tree) {
  let options = {
    plugins: [
      [stripClassCallCheck, { source: 'ember-babel' }],
      // ['minify-dead-code-elimination', { optimizeRawSize: true }]
    ]
  };

  return new Babel(tree, options)
}

module.exports.stripForProd = stripForProd;