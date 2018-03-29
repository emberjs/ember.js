module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
  ],
  plugins: [
    "ember-internal"
  ],

  rules: {
    'semi': 'error',
    'no-unused-vars': 'error',
    'no-useless-escape': 'off', // TODO: bring this back
  },

  overrides: [
    {
      files: [ 'packages/**/*.js' ],

      parserOptions: {
        ecmaVersion: 2017,
        sourceType: 'module',
      },

      globals: {
        // A safe subset of "browser:true":
        'window': true,
        'document': true,
        'setTimeout': true,
        'clearTimeout': true,
        'setInterval': true,
        'clearInterval': true,
        'console': true,
        'Map': true,
        'Set': true,
        'Symbol': true,
        'WeakMap': true,
      },

      rules: {
        'ember-internal/require-yuidoc-access': 'error',
        'ember-internal/no-const-outside-module-scope': 'error',

        'semi': 'error',
        'no-unused-vars': 'error',
        'comma-dangle': 'off',
      },
    },
    {
      files: [
        'packages/*/tests/**/*.js',
        'packages/internal-test-helpers/**/*.js',
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
      },
    },
    {
      files: [
        'node-tests/**/*.js',
        'tests/node/**/*.js',
        'blueprints/**/*.js',
        'broccoli/**/*.js',
        'bin/**/*.js',
        'config/**/*.js',
        'lib/**/*.js',
        'server/**/*.js',
        'testem.travis-browsers.js',
        'testem.dist.js',
        'ember-cli-build.js',
        'd8-runner.js',
        'rollup.config.js',
      ],

      parserOptions: {
        ecmaVersion: 2015,
        sourceType: 'script',
      },

      env: {
        node: true,
        es6: true,
      }
    },
    {
      files: [ 'node-tests/**/*.js' ],

      env: {
        mocha: true,
      },
    },
    {
      files: [ 'tests/node/**/*.js' ],

      env: {
        qunit: true
      },
    },
  ]
};
