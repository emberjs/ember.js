// @ts-check

/**
 * @import { InfiniteDepthConfigWithExtends } from 'typescript-eslint';
 * @import { ESLint, Linter } from 'eslint';
 */

export default {
  plugins: /** @satisfies {Record<string, ESLint.Plugin>} */ ({}),
  rules: /** @satisfies {Record<string, Linter.RuleEntry>} */ ({
    'no-fallthrough': 'off',
    '@typescript-eslint/no-meaningless-void-operator': 'off',
    '@typescript-eslint/restrict-template-expressions': 'off',
    '@typescript-eslint/prefer-return-this-type': 'off',
    '@typescript-eslint/no-floating-promises': 'error',
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
  }),
};
