module.exports = {
  surfaceArea: '.',
  eslint: { cache: true },
  rules: [
    // When rules are removed here make sure to convert to 'error' in eslintrc
    'prefer-spread',
    'prefer-const',
    'prefer-rest-params',
    'qunit/no-assert-equal',
    'qunit/no-commented-tests',
    'qunit/require-expect',
    '@typescript-eslint/ban-ts-comment',
    '@typescript-eslint/ban-types',
    '@typescript-eslint/no-empty-function',
    '@typescript-eslint/no-explicit-any',
    '@typescript-eslint/no-implied-eval',
    '@typescript-eslint/no-floating-promises',
    '@typescript-eslint/no-misused-promises',
    '@typescript-eslint/no-this-alias',
    '@typescript-eslint/no-unnecessary-type-assertion',
    '@typescript-eslint/no-unsafe-argument',
    '@typescript-eslint/no-unsafe-assignment',
    '@typescript-eslint/no-unsafe-call',
    '@typescript-eslint/no-unsafe-member-access',
    '@typescript-eslint/no-unsafe-return',
    '@typescript-eslint/no-var-requires',
    '@typescript-eslint/restrict-plus-operands',
    '@typescript-eslint/restrict-template-expressions',
    '@typescript-eslint/unbound-method',
  ],
  write: true,
};
