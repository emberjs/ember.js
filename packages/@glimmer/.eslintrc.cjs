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
