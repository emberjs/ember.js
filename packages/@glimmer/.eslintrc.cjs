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
  ],
};
