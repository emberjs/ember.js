const path = require('path');

module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'prettier',
    'plugin:import/errors',
  ],
  plugins: [
    'ember-internal',
    'prettier',
    'import',
  ],
  rules: {
    'semi': 'error',
    'no-unused-vars': 'error',
    'no-throw-literal': 'error',
    'no-useless-escape': 'off', // TODO: bring this back
    'prettier/prettier': 'error',
  },

  settings: {
    'import/core-modules': [
      'require',
      'backburner',
      'router',
      'ember/version',
      'node-module',
    ],
    'import/parsers': {
      'typescript-eslint-parser': ['.ts'],
    },
    'import/resolver': {
      node: {
        extensions: [ '.js', '.ts' ],
        paths: [
          path.resolve('./packages/'),
        ]
      }
    }
  },

  overrides: [
    {
      files: [ '**/*.ts' ],

      parser: 'typescript-eslint-parser',

      parserOptions: {
        sourceType: 'module',
      }
    },
    {
      files: [ 'packages/**/*.js' ],

      parserOptions: {
        ecmaVersion: 2017,
        sourceType: 'module',
      },

      globals: {
        // A safe subset of 'browser:true':
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
        'no-throw-literal': 'error',
        'comma-dangle': 'off',
      },
    },
    {
      files: [
        'packages/*/tests/**/*.js',
        'packages/@ember/*/tests/**/*.js',
        'packages/@ember/-internals/*/tests/**/*.js',
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
      // matches all node-land files
      files: [
        'node-tests/**/*.js',
        'tests/node/**/*.js',
        'blueprints/**/*.js',
        'bin/**/*.js',
        'tests/docs/*.js',
        'config/**/*.js',
        'lib/**/*.js',
        'server/**/*.js',
        'testem.js',
        'testem.travis-browsers.js',
        'testem.dist.js',
        'd8-runner.js',
        'broccoli/**/*.js',
        'ember-cli-build.js',
        'rollup.config.js',
      ],

      parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'script',
      },

      env: {
        node: true,
        es6: true,
      },

      plugins: ['node'],
      rules: Object.assign({}, require('eslint-plugin-node').configs.recommended.rules, {
        // add your custom rules and overrides for node files here
        'no-process-exit': 'off',
        'no-throw-literal': 'error'
      }),
    },
    {
      // matches node-land files that aren't shipped to consumers (allows using Node 6+ features)
      files: [
        'broccoli/**/*.js',
        'tests/node/**/*.js',
        'ember-cli-build.js',
        'rollup.config.js',
        'd8-runner.js',
      ],

      rules: {
        'node/no-unsupported-features': ['error', { version: 6 }],
      }
    },
    {
      files: [ 'node-tests/**/*.js' ],

      env: {
        mocha: true,
      },
    },
    {
      files: [
        'tests/docs/**/*.js',
        'tests/node/**/*.js',
      ],

      env: {
        qunit: true
      },
    },
  ]
};
