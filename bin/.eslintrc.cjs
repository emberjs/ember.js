const { resolve } = require('path');

const tsconfig = resolve(__dirname, 'tsconfig.json');

// node files
module.exports = {
  root: false,
  env: {
    es6: true,
  },
  overrides: [
    {
      files: ['*.{ts,js,d.ts}'],
      parserOptions: {
        ecmaVersion: 'latest',
        project: [tsconfig],
      },
      extends: ['plugin:@typescript-eslint/recommended'],

      rules: {
        'dot-notation': 'off',
        'no-console': 'off',
        'no-continue': 'off',
        'n/no-unsupported-features/es-syntax': [
          'error',
          {
            ignores: [],
            version: '>=16.0.0',
          },
        ],
        'n/shebang': 'off',
      },
    },
  ],
};
