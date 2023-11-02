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
        // We don't publish source, we build to a dist directory
        'n/no-unpublished-import': ['off'],
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
    //////////////////////////////////////////////////////////
    // Remove when https://github.com/glimmerjs/glimmer-vm/pull/1462
    // is merged.
    //////////////////////////////////////////////////////////
    {
      files: [
        'vm/lib/registers.ts',
        'node/lib/serialize-builder.ts',
        'util/lib/immediate.ts',
        'util/test/immediate-test.ts',
        'runtime/lib/vm/rehydrate-builder.ts',
        'runtime/lib/dom/normalize.ts',
        'syntax/lib/parser/handlebars-node-visitors.ts',
      ],
      rules: {
        '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      },
    },
    {
      files: ['interfaces/lib/compile/encoder.ts'],
      rules: {
        '@typescript-eslint/no-duplicate-type-constituents': 'off',
      },
    },
    {
      files: [
        'compiler/lib/builder/builder-interface.ts',
        'syntax/test/support.ts',
        'destroyable/test/destroyables-test.ts',
        'syntax/test/plugin-node-test.ts',
        'syntax/test/loc-node-test.ts',
        'syntax/test/parser-node-test.ts',
        'reference/test/iterable-test.ts',
        'reference/test/references-test.ts',
        'test/traversal/visiting-keys-node-test.ts',
        'syntax/test/traversal/visiting-node-test.ts',
        'syntax/test/traversal/visiting-keys-node-test.ts',
      ],
      rules: {
        '@typescript-eslint/no-redundant-type-constituents': 'off',
      },
    },
    {
      files: [
        'util/lib/debug-to-string.ts',
        'debug/lib/debug.ts',
        'manager/lib/public/component.ts',
        'manager/lib/public/helper.ts',
        'manager/lib/public/modifier.ts',
        'runtime/lib/debug-render-tree.ts',
        'runtime/lib/compiled/opcodes/content.ts',
        'syntax/lib/v2/normalize.ts',
      ],
      rules: {
        '@typescript-eslint/no-base-to-string': 'off',
      },
    },
    {
      files: ['util/lib/simple-cast.ts'],
      rules: {
        'valid-typeof': 'off',
      },
    },
    {
      files: ['syntax/lib/source/source.ts'],
      rules: {
        '@typescript-eslint/no-inferrable-types': 'off',
      },
    },
    {
      files: ['validator/lib/utils.ts'],
      rules: {
        'n/no-unsupported-features/es-builtins': 'off',
      },
    },
  ],
};
