'use strict';

const Babel = require('broccoli-babel-transpiler');
const injectBabelHelpers = require('./transforms/inject-babel-helpers');

module.exports = function toES6(tree, _options) {
  let options = Object.assign({}, _options);

  options.sourceMaps = true;
  options.plugins = [
    injectBabelHelpers,
    ['transform-es2015-template-literals', { loose: true }],
    ['transform-es2015-literals'],
    ['transform-es2015-arrow-functions'],
    ['transform-es2015-destructuring', { loose: true }],
    ['transform-es2015-spread', { loose: true }],
    ['transform-es2015-parameters'],
    ['transform-es2015-computed-properties', { loose: true }],
    ['transform-es2015-shorthand-properties'],
    ['transform-es2015-block-scoping', { throwIfClosureRequired: true }],
    ['check-es2015-constants'],
    ['transform-es2015-classes', { loose: true }],
    ['transform-object-assign'],
  ];

  if (options.inlineHelpers) {
    options.plugins.shift();
    delete options.inlineHelpers;
  }

  return new Babel(tree, options);
};
