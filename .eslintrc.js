const path = require('path');

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  reportUnusedDisableDirectives: true,
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/typescript',
    'plugin:qunit/recommended',
    'plugin:prettier/recommended',
  ],
  plugins: ['ember-internal', 'import', 'qunit', 'disable-features'],
  rules: {
    'no-console': 'error',
    'no-implicit-coercion': 'error',
    'no-new-wrappers': 'error',
    'no-unused-vars': 'error',
    'no-throw-literal': 'error',
    'no-var': 'error',

    'disable-features/disable-async-await': 'error',
    'disable-features/disable-generator-functions': 'error',

    // Remove from esplintrc when no longer warning
    'qunit/no-assert-equal': 'warn',
    'qunit/no-commented-tests': 'warn',
    'qunit/require-expect': 'warn',
  },

  settings: {
    'import/core-modules': ['require', 'backburner', 'router', '@glimmer/interfaces'],
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts', '.d.ts'],
        paths: [path.resolve('./packages/')],
      },
    },
  },

  overrides: [
    {
      files: ['*.ts'],

      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
      ],

      parserOptions: {
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },

      rules: {
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

        // Typescript provides better types with these rules enabled
        // Remove from esplintrc when no longer warning
        'prefer-spread': 'warn',
        'prefer-const': 'warn',
        'prefer-rest-params': 'warn',

        // Remove from esplintrc when no longer warning
        '@typescript-eslint/ban-ts-comment': 'warn',
        '@typescript-eslint/ban-types': 'warn',
        '@typescript-eslint/no-empty-function': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-implied-eval': 'warn',
        '@typescript-eslint/no-floating-promises': 'warn',
        '@typescript-eslint/no-misused-promises': 'warn',
        '@typescript-eslint/no-this-alias': 'warn',
        '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
        '@typescript-eslint/no-unsafe-argument': 'warn',
        '@typescript-eslint/no-unsafe-assignment': 'warn',
        '@typescript-eslint/no-unsafe-call': 'warn',
        '@typescript-eslint/no-unsafe-member-access': 'warn',
        '@typescript-eslint/no-unsafe-return': 'warn',
        '@typescript-eslint/no-var-requires': 'warn',
        '@typescript-eslint/restrict-plus-operands': 'warn',
        '@typescript-eslint/restrict-template-expressions': 'warn',
        '@typescript-eslint/unbound-method': 'warn',
      },
    },
    {
      // TODO: files: ['packages/**/*.[jt]s'],
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
        Event: true,
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
