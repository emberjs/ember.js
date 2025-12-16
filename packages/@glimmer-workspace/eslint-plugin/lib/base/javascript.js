// @ts-check

/**
 * @import { InfiniteDepthConfigWithExtends } from 'typescript-eslint';
 * @import { ESLint, Linter } from 'eslint';
 */

import jslint from '@eslint/js';
import importPlugin from 'eslint-plugin-import-x';
import nodePlugin from 'eslint-plugin-n';
import * as regexp from 'eslint-plugin-regexp';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';

export default {
  plugins: /** @satisfies {Record<string, ESLint.Plugin>} */ ({
    regexp,
    'unused-imports': unusedImports,
    'simple-import-sort': simpleImportSort,
    n: nodePlugin,
  }),
  extends: /** @satisfies {InfiniteDepthConfigWithExtends[]} */ ([
    jslint.configs.recommended,
    importPlugin.flatConfigs.recommended,
    importPlugin.flatConfigs.typescript,
    nodePlugin.configs['flat/recommended-script'],
  ]),
  rules: /** @satisfies {Record<string, Linter.RuleEntry>} */ ({
    // handled by eslint-plugin-import
    'n/no-missing-import': 'off',
    'n/no-extraneous-import': 'off',
    'n/no-process-exit': 'error',

    'no-redeclare': 'off',
    'prefer-const': 'off',
    'no-debugger': 'error',
    ...regexp.configs['flat/recommended'].rules,
    'regexp/grapheme-string-literal': 'error',
    'regexp/hexadecimal-escape': 'error',
    'regexp/letter-case': 'error',
    'regexp/no-control-character': 'error',
    'regexp/no-octal': 'error',
    'regexp/no-standalone-backslash': 'error',
    // 'regexp/no-super-linear-move': 'error',
    'regexp/prefer-escape-replacement-dollar-char': 'error',
    'regexp/prefer-lookaround': 'error',
    'regexp/prefer-named-backreference': 'error',
    // 'regexp/prefer-named-capture-group': 'error',
    'regexp/prefer-named-replacement': 'error',
    'regexp/prefer-quantifier': 'error',
    'regexp/prefer-regexp-exec': 'error',
    'regexp/prefer-regexp-test': 'error',
    'regexp/prefer-result-array-groups': 'error',
    'regexp/require-unicode-regexp': ['error'],
    'require-unicode-regexp': ['error', { requireFlag: 'u' }],
    'regexp/require-unicode-sets-regexp': 'off',
    'regexp/sort-alternatives': 'error',
    'regexp/sort-character-class-elements': 'error',
    'regexp/unicode-escape': 'error',
    'regexp/unicode-property': 'error',
    'unused-imports/no-unused-imports': 'error',
    '@typescript-eslint/no-unused-vars': 'off',

    // these lints are captured by TypeScript checks and are slow
    // https://typescript-eslint.io/troubleshooting/typed-linting/performance/#eslint-plugin-import
    'import-x/named': 'off',
    'import-x/namespace': 'off',
    'import-x/no-named-as-default-member': 'off',
    'import-x/default': 'off',
    'import-x/no-unresolved': 'off',
    'import-x/no-named-as-default': 'off',

    'import-x/consistent-type-specifier-style': ['error', 'prefer-top-level'],
    'import-x/no-relative-packages': 'error',
    'import-x/no-extraneous-dependencies': 'error',
    'import-x/first': 'error',
    'import-x/newline-after-import': 'error',
    'import-x/no-duplicates': 'error',

    'unused-imports/no-unused-vars': [
      'error',
      { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
    ],
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
  }),
};
