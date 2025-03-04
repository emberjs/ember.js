import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import emberInternal from 'eslint-plugin-ember-internal';
import _import from 'eslint-plugin-import';
import qunit from 'eslint-plugin-qunit';
import disableFeatures from 'eslint-plugin-disable-features';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';
import n from 'eslint-plugin-n';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: [
      'blueprints/*/*files/**/*.js',
      'blueprints/*/*files/**/*.ts',
      'node-tests/fixtures/**/*.js',
      'docs/',
      '**/.*',
      '**/dist/',
      '**/tmp/',
      '**/smoke-tests/',
      '**/types/',
      '**/type-tests/',
    ],
  },
  ...fixupConfigRules(
    compat.extends(
      'eslint:recommended',
      'plugin:import/errors',
      'plugin:import/typescript',
      'plugin:qunit/recommended',
      'plugin:prettier/recommended'
    )
  ),
  {
    plugins: {
      'ember-internal': emberInternal,
      import: fixupPluginRules(_import),
      qunit: fixupPluginRules(qunit),
      'disable-features': disableFeatures,
    },

    linterOptions: {
      reportUnusedDisableDirectives: true,
    },

    languageOptions: {
      parser: tsParser,
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

    rules: {
      'no-console': 'error',
      'no-implicit-coercion': 'error',
      'no-new-wrappers': 'error',
      'no-unused-vars': 'error',
      'no-throw-literal': 'error',
      'no-var': 'error',

      'qunit/no-assert-equal': 'off',
      'qunit/no-commented-tests': 'off',
      'qunit/require-expect': 'off',

      'disable-features/disable-async-await': 'error',
      'disable-features/disable-generator-functions': 'error',
      // Doesn't work with package.json#exports
      'import/no-unresolved': 'off',
    },
  },
  ...compat.extends('plugin:@typescript-eslint/recommended').map((config) => ({
    ...config,
    files: ['**/*.ts'],
  })),
  {
    files: ['**/*.ts'],

    languageOptions: {
      ecmaVersion: 5,
      sourceType: 'module',

      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },

    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          // these are the settings recommended by typescript-eslint to follow
          // typescript's own default unused variable naming policies.
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      // these default to 'warn' in @typescript-eslint/recommended. But
      // warnings just get ignored and allowed to generate noise. We should
      // either commit to making them errors or leave them off.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',

      // TODO: Enable and fix these rules
      // Typescript provides better types with these rules enabled
      'prefer-spread': 'off',
      'prefer-const': 'off',
      'prefer-rest-params': 'off',
    },
  },
  {
    // TODO: files: ['packages/**/*.[jt]s'],
    files: ['packages/**/*.js'],

    languageOptions: {
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

      ecmaVersion: 2017,
      sourceType: 'module',
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

    languageOptions: {
      globals: {
        ...globals.qunit,
        expectAssertion: true,
        expectDeprecation: true,
        expectDeprecationAsync: true,
        expectNoDeprecation: true,
        expectWarning: true,
        expectNoWarning: true,
        ignoreAssertion: true,
        ignoreDeprecation: true,
      },
    },

    rules: {
      'disable-features/disable-async-await': 'off',
      'disable-features/disable-generator-functions': 'off',
    },
  },
  ...compat.extends('plugin:n/recommended').map((config) => ({
    ...config,

    files: [
      '**/rollup.config.mjs',
      '**/babel.config.mjs',
      '**/babel.test.config.mjs',
      'node-tests/**/*.js',
      'tests/node/**/*.js',
      'blueprints/**/*.js',
      'bin/**/*.js',
      'bin/**/*.mjs',
      'tests/docs/*.js',
      'config/**/*.js',
      'lib/**/*.js',
      'server/**/*.js',
      '**/testem.js',
      '**/testem.ci-browsers.js',
      '**/testem.browserstack.js',
      'broccoli/**/*.js',
      '**/ember-cli-build.js',
      '**/*.cjs',
    ],
  })),
  {
    files: [
      '**/rollup.config.mjs',
      '**/babel.config.mjs',
      '**/babel.test.config.mjs',
      'node-tests/**/*.js',
      'tests/node/**/*.js',
      'blueprints/**/*.js',
      'bin/**/*.js',
      'bin/**/*.mjs',
      'tests/docs/*.js',
      'config/**/*.js',
      'lib/**/*.js',
      'server/**/*.js',
      '**/testem.js',
      '**/testem.ci-browsers.js',
      '**/testem.browserstack.js',
      'broccoli/**/*.js',
      '**/ember-cli-build.js',
      '**/*.cjs',
    ],

    plugins: {
      n,
    },

    languageOptions: {
      globals: {
        ...globals.node,
      },

      ecmaVersion: 2018,
      sourceType: 'commonjs',
    },

    rules: {
      'no-process-exit': 'off',
      'no-throw-literal': 'error',
      'disable-features/disable-async-await': 'off',
      'disable-features/disable-generator-functions': 'off',
    },
  },
  {
    files: ['node-tests/**/*.js'],

    languageOptions: {
      globals: {
        ...globals.mocha,
      },
    },
  },
  {
    files: ['tests/docs/**/*.js', 'tests/node/**/*.js'],

    languageOptions: {
      globals: {
        ...globals.qunit,
      },
    },
  },
];
