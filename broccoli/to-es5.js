'use strict';
/* eslint-env node */

const Babel = require('broccoli-babel-transpiler');
const injectBabelHelpers = require('./transforms/inject-babel-helpers');
const { RELEASE, DEBUG } = require('./features');

module.exports = function toES5(tree, _options) {
  let options = Object.assign({
    environment: 'developement'
  }, _options);
  options.plugins = [
    injectBabelHelpers,
    ['feature-flags', {
      import: {
        name: 'isFeatureEnabled',
        module: 'ember-debug'
      },
      features: options.environment === 'production' ? RELEASE : DEBUG
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
    ['transform-es2015-classes', {loose: true}],
    ['transform-proto-to-assign'],
  ];

  if (options.inlineHelpers) {
    options.plugins.shift();
    delete options.inlineHelpers;
  }

  if (options.environment === 'production') {
    options.plugins.push([
      'filter-imports', {
        'ember-debug/deprecate': ['deprecate'],
        'ember-debug': ['assert', 'debug', 'deprecate', 'info', 'runInDebug', 'warn', 'debugSeal', 'debugFreeze']
      }
    ]);
  }

  delete options.environment;

  return new Babel(tree, options);
}