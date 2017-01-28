var fs = require('fs');
var path = require('path');

function isEmberJSBuildLinked() {
  var emberjsBuildPath = path.dirname(require.resolve('emberjs-build'));
  var emberjsBuildLinked = emberjsBuildPath.indexOf(__dirname + '/node_modules') === -1;

  return emberjsBuildLinked;
}

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

if (isEmberJSBuildLinked()) {
  delete options.plugins;

  for (var ruleName in options.rules) {
    var ruleParts = ruleName.split('ember-internal/');

    if (ruleParts.length > 1) {
      options.rules[ruleParts[1]] = options.rules[ruleName];
      delete options.rules[ruleName];
    }
  }
}

module.exports = options;
