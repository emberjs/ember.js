// @ts-check

const { resolve } = require('path');

const cjsTsconfig = resolve(__dirname, 'tsconfig.cjs.json');

/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  reportUnusedDisableDirectives: true,
  extends: [],
  ignorePatterns: [
    'dist',
    'ts-dist',
    'node_modules',
    'tmp',
    '**/node_modules',
    '**/dist',
    '**/fixtures',
    '!**/.eslintrc.cjs',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    project: [],
  },
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.js', '.cjs', '.mjs', '.mts', '.ts', '.d.ts'],
    },
    'import/resolver': {
      typescript: {},
    },
    node: {
      allowModules: ['@glimmer/debug', '@glimmer/local-debug-flags'],
      tryExtensions: ['.js', '.ts', '.d.ts', '.json'],
    },
  },
  plugins: [
    '@typescript-eslint',
    'prettier',
    'qunit',
    'simple-import-sort',
    'unused-imports',
    'prettier',
    'n',
  ],

  rules: {},
  overrides: [
    {
      files: ['.eslintrc.cjs', '**/.eslintrc.cjs'],
      parserOptions: {
        project: [cjsTsconfig],
      },
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:import/errors',
        'plugin:import/typescript',
        'plugin:qunit/recommended',
        'prettier',
      ],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },

    {
      // these packages need to be fixed to avoid these warnings, but in the
      // meantime we should not regress the other packages
      files: [
        // this specific test imports from @glimmer/runtime (causing a cyclic
        // dependency), it should either be refactored to use the interfaces
        // directly (instead of the impls) or moved into @glimmer/runtime
        'packages/@glimmer/reference/test/template-test.ts',
      ],
      rules: {
        'n/no-extraneous-import': 'warn',
      },
    },
  ],
};
