'use strict';

module.exports = {
  root: false,
  env: {
    node: true,
  },
  globals: {
    require: true,
    __dirname: true,
  },
  rules: {
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-var-requires': 'off',
  },
};
