const { resolve } = require('path');

const libTsconfig = resolve(__dirname, 'tsconfig.json');
const testTsconfig = resolve(__dirname, 'tsconfig.test.json');

/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: false,
  overrides: [
    {
      files: ['*.{ts,js,d.ts}'],
      parserOptions: {
        ecmaVersion: 'latest',
        project: [libTsconfig, testTsconfig],
      },
      plugins: ['@glimmer-workspace'],
      extends: ['plugin:@glimmer-workspace/recommended'],
      rules: {
        'n/no-unpublished-import': 'off',
      },
    },
    {
      files: ['./reference/lib/**/*.ts'],
      rules: {
        'import/no-relative-parent-imports': 'error',

        'import/no-internal-modules': [
          'error',
          {
            allow: ['**/internal/*', '**/index.*'],
          },
        ],
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

    // TODO: / CLEANUP: / TECHDEBT:
    {
      files: [
        'vm/lib/registers.ts',
        'node/lib/serialize-builder.ts',
        'util/lib/immediate.ts',
        'runtime/lib/dom/normalize.ts',
        'runtime/lib/vm/rehydrate-builder.ts',
        'syntax/lib/parser/handlebars-node-visitors.ts',
        'util/test/immediate-test.ts',
      ],
      rules: {
        '@typescript-eslint/no-unsafe-enum-comparison': 'warn',
      },
    },
    {
      files: [
        'debug/lib/debug.ts',
        'util/lib/debug-to-string.ts',
        'manager/lib/public/modifier.ts',
        'manager/lib/public/helper.ts',
        'manager/lib/public/component.ts',
        'runtime/lib/debug-render-tree.ts',
        'runtime/lib/compiled/opcodes/content.ts',
        'syntax/lib/v2/normalize.ts',
      ],
      rules: {
        '@typescript-eslint/no-base-to-string': 'warn',
      },
    },
    {
      files: [
        'validator/lib/debug.ts',
        'runtime/lib/modifiers/on.ts',
        'syntax/lib/parser/tokenizer-event-handlers.ts',
        'syntax/lib/get-template-locals.ts',
        'syntax/lib/generation/printer.ts',
        'syntax/lib/v2/normalize.ts',
        'syntax/test/traversal/manipulating-node-test.ts',
        'node/lib/node-dom-helper.ts',
      ],
      rules: {
        'deprecation/deprecation': 'warn',
      },
    },
    {
      files: ['util/lib/simple-cast.ts'],
      rules: {
        'valid-typeof': 'warn',
      },
    },
  ],
};
