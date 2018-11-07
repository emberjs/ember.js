'use strict';

const Babel = require('broccoli-babel-transpiler');

module.exports = function stripForProd(tree) {
  let options = {
    plugins: [['filter-imports', { imports: { 'ember-babel': ['_classCallCheck'] } }]],
  };

  return new Babel(tree, options);
};
