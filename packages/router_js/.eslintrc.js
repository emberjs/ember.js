'use strict';

module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  plugins: ['prettier'],
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  env: {
    browser: true,
  },
  rules: {},
  overrides: [
    // typescript files
    {
      files: ['**/*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json',

        // allows eslint from any dir
        tsconfigRootDir: __dirname,
      },
      plugins: ['@typescript-eslint'],
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
      settings: {
        node: {
          tryExtensions: ['.js', '.json', '.d.ts', '.ts'],

          convertPath: [
            {
              include: ['lib/**/*.ts'],
              replace: ['^lib/(.+)\\.ts$', 'dist/$1.js'],
            },
          ],
        },
      },
      rules: {
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            args: 'none',
          },
        ],

        // TODO: stop disabling these rules
        'prefer-const': 'off',
        'no-prototype-builtins': 'off',
        '@typescript-eslint/ban-types': [
          'error',
          {
            extendDefaults: true,
            types: {
              '{}': false,
            },
          },
        ],
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },

    // tests
    {
      files: ['tests/**/*.[jt]s'],
      env: {
        qunit: true,
      },
    },

    // node files
    {
      files: ['.eslintrc.js', 'ember-cli-build.js', 'testem.js', 'server/**/*.js'],
      parserOptions: {
        sourceType: 'script',
      },
      env: {
        browser: false,
        node: true,
      },
    },
  ],
};
