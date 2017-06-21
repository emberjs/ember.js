var fs = require('fs');
var path = require('path');

var options = {
  root: true,
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  },
  extends: 'eslint:recommended',
  plugins: [
    "ember-internal"
  ],
  env: {
    qunit: true,
  },
  globals: {
    'expectAssertion': true,
    'expectDeprecation': true,
    'expectNoDeprecation': true,
    'expectWarning': true,
    'expectNoWarning': true,
    'ignoreAssertion': true,
    'ignoreDeprecation': true,

    // A safe subset of "browser:true":
    'window': true,
    'document': true,
    'setTimeout': true,
    'clearTimeout': true,
    'setInterval': true,
    'clearInterval': true,

    'Symbol': true,
    'WeakMap': true,
  },
  rules: {
    'ember-internal/require-yuidoc-access': 'error',
    'ember-internal/no-const-outside-module-scope': 'error',
    'no-unused-vars': ["error", { "args": "none" }],

    // temporarily disabled
    'comma-dangle': 'off',
  },
};

module.exports = options;
