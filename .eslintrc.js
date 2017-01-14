module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  },
  extends: 'eslint:recommended',
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
    'require-yuidoc-access': 'error',
    'no-const-outside-module-scope': 'error',

    // temporarily disabled
    'no-unused-vars': 'off',
    'comma-dangle': 'off',
  },
};
