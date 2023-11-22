// @ts-check

/** @type {import("eslint").ESLint.Plugin} */
module.exports = {
  meta: {
    name: '@glimmer-workspace/eslint-plugin',
    version: '1.0.0',
  },
  configs: {
    recommended: {
      settings: {
        'import/parsers': {
          '@typescript-eslint/parser': ['.js', '.cjs', '.mjs', '.mts', '.ts', '.d.ts'],
        },
        'import/resolver': {
          typescript: {
            alwaysTryTypes: true,
          },
        },
        node: {
          allowModules: ['@glimmer/debug', '@glimmer/local-debug-flags'],
          tryExtensions: ['.cjs', '.js', '.ts', '.d.ts', '.json'],
        },
      },
      env: {
        es6: true,
      },
      plugins: [
        '@typescript-eslint',
        'prettier',
        'qunit',
        'simple-import-sort',
        'unused-imports',
        'import',
        'prettier',
        'n',
      ],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:n/recommended-module',
        'plugin:import/recommended',
        'plugin:qunit/recommended',
        'plugin:regexp/recommended',
        'plugin:deprecation/recommended',
        'prettier',
      ],
      rules: {
        'prefer-arrow-callback': 'error',
        'no-restricted-imports': 'off',
        'no-inner-declarations': 'off',
        '@typescript-eslint/no-restricted-imports': [
          'error',
          {
            patterns: [
              { group: ['**/generated/**'], message: "Don't import directly from generated files" },
              {
                group: ['console', 'node:console'],
                message: "Don't import directly from 'console'",
              },
            ],
          },
        ],
        '@typescript-eslint/no-redundant-type-constituents': 'off',
        'no-console': 'error',
        'no-debugger': 'error',
        'no-loop-func': 'error',
        'prefer-const': 'off',
        'no-fallthrough': 'off',

        'qunit/require-expect': ['error', 'never-except-zero'],
        // we're using assert.step instead of this sort of thing
        'qunit/no-conditional-assertions': 'off',
        'regexp/require-unicode-regexp': 'error',
        'regexp/unicode-escape': 'error',
        'regexp/sort-character-class-elements': 'error',
        'regexp/prefer-result-array-groups': 'error',
        'regexp/prefer-named-replacement': 'error',
        'regexp/prefer-named-backreference': 'error',
        'regexp/prefer-lookaround': 'error',
        'regexp/use-ignore-case': 'error',
        'regexp/prefer-regexp-test': 'error',
        'regexp/prefer-regexp-exec': 'error',
        'regexp/prefer-quantifier': 'error',
        'require-unicode-regexp': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/consistent-type-exports': 'error',
        '@typescript-eslint/no-import-type-side-effects': 'error',
        '@typescript-eslint/naming-convention': [
          'error',
          {
            format: ['camelCase', 'PascalCase'],
            leadingUnderscore: 'allow',
            selector: ['parameter'],
          },
          {
            format: null,
            modifiers: ['const'],
            selector: 'variable',
          },
          {
            format: ['PascalCase'],
            leadingUnderscore: 'allow',
            selector: ['typeLike'],
          },
          {
            format: ['PascalCase', 'UPPER_CASE'],
            selector: ['typeAlias'],
          },
        ],
        'require-await': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-inferrable-types': 'error',
        '@typescript-eslint/no-require-imports': 'error',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',

        'n/no-missing-import': 'off',
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': [
          'error',
          { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
        ],
        'n/no-unpublished-require': 'off',
        'import/consistent-type-specifier-style': 'error',
        'import/no-relative-packages': 'error',
        'import/default': 'off',
        'import/no-unresolved': 'error',
        'import/no-extraneous-dependencies': 'error',
        'sort-imports': 'off',
        'simple-import-sort/imports': [
          'error',
          {
            groups: [
              // == Side effect imports. ==
              ['^\\u0000'],

              // == from node:* ==
              [
                //
                '^node:.+\\u0000$',
                '^node:',
              ],

              // == From (optionally scoped) packages
              [
                // import type
                '^@?\\w.+\\u0000$',
                '^@?\\w',
              ],

              // == from absolute imports ==
              //
              // (Absolute imports and other imports such as Vue-style `@/foo`. Anything not matched
              // in another group.)
              [
                // import type
                '^.+\\u0000$',
                '^',
              ],

              // == Relative imports ==.
              [
                // import type
                '^\\..+\\u0000$',
                '^\\.',
              ],
            ],
          },
        ],
        'simple-import-sort/exports': 'error',
        'no-unused-private-class-members': 'error',
        'import/first': 'error',
        'import/newline-after-import': 'error',
        'import/no-duplicates': 'error',

        'n/no-unsupported-features/es-syntax': 'off',
        'n/no-unsupported-features/node-builtins': 'off',
      },
    },
  },
};
