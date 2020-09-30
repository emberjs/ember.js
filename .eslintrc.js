const path = require('path');

module.exports = {
  root: true,
  parser: 'babel-eslint',
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:qunit/recommended',
    'plugin:prettier/recommended',
  ],
  plugins: ['ember-internal', 'import', 'qunit', 'disable-features'],
  rules: {
    'no-implicit-coercion': 'error',
    'no-new-wrappers': 'error',
    'no-unused-vars': 'error',
    'no-throw-literal': 'error',
    'no-var': 'error',
    'qunit/no-commented-tests': 'off',
    'qunit/require-expect': 'off',
    'disable-features/disable-async-await': 'error',
    'disable-features/disable-generator-functions': 'error',
  },

  settings: {
    'import/core-modules': ['require', 'backburner', 'router', 'ember/version', 'node-module'],
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts'],
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
        paths: [path.resolve('./packages/')],
      },
    },
  },

  overrides: [
    {
      files: ['**/*.ts'],

      parser: '@typescript-eslint/parser',
      extends: [
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:import/typescript',
        'prettier/@typescript-eslint',
      ],

      parserOptions: {
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },

      rules: {
        // the TypeScript compiler already takes care of this and
        // leaving it enabled results in false positives for interface imports
        'no-unused-vars': 'off',

        // TODO: Enable and fix these rules
        // Typescript provides better types with these rules enabled
        'prefer-spread': 'off',
        'prefer-const': 'off',
        'prefer-rest-params': 'off',

        'import/export': 'off',
        // TODO: Remove with typescript 3.8
        // Use `import type` instead
        'import/named': 'off',
        'import/no-unresolved': 'off',
      },
    },
    {
      files: ['packages/**/*.js'],

      parserOptions: {
        ecmaVersion: 2017,
        sourceType: 'module',
      },

      globals: {
        // A safe subset of 'browser:true':
        window: true,
        document: true,
        setTimeout: true,
        clearTimeout: true,
        setInterval: true,
        clearInterval: true,
        console: true,
        Map: true,
        Set: true,
        Symbol: true,
        WeakMap: true,
      },

      rules: {
        'ember-internal/require-yuidoc-access': 'error',
        'ember-internal/no-const-outside-module-scope': 'error',
      },
    },
    {
      files: [
        'packages/*/tests/**/*.[jt]s',
        'packages/@ember/*/tests/**/*.[jt]s',
        'packages/@ember/-internals/*/tests/**/*.[jt]s',
        'packages/internal-test-helpers/**/*.[jt]s',
      ],
      env: {
        qunit: true,
      },
      globals: {
        expectAssertion: true,
        expectDeprecation: true,
        expectDeprecationAsync: true,
        expectNoDeprecation: true,
        expectWarning: true,
        expectNoWarning: true,
        ignoreAssertion: true,
        ignoreDeprecation: true,
      },
      rules: {
        'disable-features/disable-async-await': 'off',
        'disable-features/disable-generator-functions': 'off',
      },
    },
    {
      // matches all node-land files
      files: [
        '.eslintrc.js',
        'node-tests/**/*.js',
        'tests/node/**/*.js',
        'blueprints/**/*.js',
        'bin/**/*.js',
        'tests/docs/*.js',
        'config/**/*.js',
        'lib/**/*.js',
        'server/**/*.js',
        'testem.js',
        'testem.ci-browsers.js',
        'testem.browserstack.js',
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
        'no-throw-literal': 'error',
        'disable-features/disable-async-await': 'off',
        'disable-features/disable-generator-functions': 'off',
      }),
    },
    {
      files: ['node-tests/**/*.js'],

      env: {
        mocha: true,
      },
    },
    {
      files: ['tests/docs/**/*.js', 'tests/node/**/*.js'],

      env: {
        qunit: true,
      },
    },
  ],
};
