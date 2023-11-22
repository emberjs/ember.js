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
      files: ['./package.json', '**/package.json'],
      parser: 'jsonc-eslint-parser',
      extends: ['plugin:jsonc/recommended-with-json', 'plugin:jsonc/prettier'],
      rules: {
        // Enforce order in the scripts object
        // https://ota-meshi.github.io/eslint-plugin-jsonc/rules/sort-keys.html
        'jsonc/sort-keys': [
          'error',
          {
            pathPattern: '^$',
            order: [
              'name',
              'version',
              'license',
              'description',
              'repository',
              'author',
              'type',
              'main',
              'types',
              'module',
              'exports',
              'publishConfig',
              'files',
              'scripts',
              'dependencies',
              'peerDependencies',
              'devDependencies',
              'release-it',
              'changelog',
              'engines',
              'volta',
            ],
          },
          {
            pathPattern:
              'scripts|devDependencies|peerDependencies|optionalDependencies|pnpm|overrides|peerDependencyRules|patchedDependencies|dependenciesMeta',
            order: { type: 'asc' },
          },
          // ...
        ],
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

    // QUnit is a weird package, and there are some issues open about fixing it
    // - https://github.com/qunitjs/qunit/issues/1729
    // - https://github.com/qunitjs/qunit/issues/1727
    // - https://github.com/qunitjs/qunit/issues/1724
    {
      files: ['**/*-test.ts', '**/{test,integration-tests}/**/*.ts'],
      rules: {
        '@typescript-eslint/unbound-method': 'off',
      },
    },
  ],
};
