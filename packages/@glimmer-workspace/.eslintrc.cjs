const { resolve } = require('path');

const tsconfig = resolve(__dirname, 'tsconfig.json');

/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: false,
  overrides: [
    {
      files: ['*/index.{js,ts,d.ts}', '*/lib/**/*.{js,ts,d.ts}', '*/test/**/*.{js,ts,d.ts}'],
      excludedFiles: ['node_modules', '*/node_modules'],
      parserOptions: {
        ecmaVersion: 'latest',
        project: [tsconfig],
      },
      plugins: ['@glimmer-workspace'],
      extends: ['plugin:@glimmer-workspace/recommended'],
    },
  ],
};
