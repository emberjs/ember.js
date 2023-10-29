// @ts-check

/** @type {import("eslint").ESLint.Plugin} */
module.exports = {
  meta: {
    name: '@glimmer-workspace/eslint-plugin',
    version: '1.0.0',
  },
  configs: {
    recommended: {
      plugins: [
        '@typescript-eslint',
        'prettier',
        'qunit',
        'simple-import-sort',
        'unused-imports',
        'prettier',
        'n',
      ],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:n/recommended',
        'plugin:import/recommended',
        'plugin:qunit/recommended',
        'plugin:regexp/recommended',
        'prettier',
      ],
      rules: {
        'no-restricted-imports': 'off',
        '@typescript-eslint/no-restricted-imports': [
          'error',
          {
            patterns: [
              { group: ['**/generated/**'], message: "Don't import directly from generated files" },
            ],
          },
        ],
        'no-console': 'error',
        'no-debugger': 'error',
        'no-loop-func': 'error',
        'prefer-const': 'off',
        'no-fallthrough': 'off',
        'import/no-relative-packages': 'error',
        'import/default': 'off',
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
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': [
          'warn',
          { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
        ],
        'n/no-unpublished-require': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/consistent-type-imports': [
          'error',
          {
            fixStyle: 'separate-type-imports',
          },
        ],
        '@typescript-eslint/consistent-type-exports': [
          'error',
          {
            fixMixedExportsWithInlineTypeSpecifier: true,
          },
        ],
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
        'n/no-unsupported-features/es-syntax': 'off',
        'n/no-unsupported-features/node-builtins': 'off',
      },
    },
  },
};
