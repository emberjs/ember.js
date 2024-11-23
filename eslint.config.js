// @ts-check
import gitignore from 'eslint-config-flat-gitignore';

import {
  code,
  compat,
  jsons,
  override,
  tslint,
  node,
  config,
} from '@glimmer-workspace/eslint-plugin';

/** @internal */
export default config(
  gitignore(),
  {
    name: '@glimmer-workspace/ignores',
    ignores: ['ts-dist/**/*'],
  },
  override('no-console packages', {
    filter: 'env!=console',
    rules: { 'no-console': 'error' },
  }),
  override('console packages', {
    filter: 'env=console',
    rules: { 'no-console': 'off' },
  }),
  code('strict packages', {
    filter: 'strictness=strict',
    extends: [tslint.configs.strictTypeChecked],
    rules: {
      '@typescript-eslint/consistent-return': 'off',
      '@typescript-eslint/no-invalid-void-type': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/no-confusing-void-expression': [
        'error',
        { ignoreVoidOperator: true, ignoreVoidReturningFunctions: true },
      ],
      '@typescript-eslint/no-unnecessary-condition': [
        'error',
        { allowConstantLoopConditions: true, checkTypePredicates: false },
      ],
    },
  }),
  code('loose packages', {
    filter: 'strictness=loose',
    extends: [tslint.configs.recommendedTypeChecked],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-deprecated': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  }),
  code('test packages', {
    filter: 'scope=@glimmer-test',
    extends: [tslint.configs.recommendedTypeChecked, compat.extends('plugin:qunit/recommended')],
    rules: {
      'qunit/require-expect': ['error', 'never-except-zero'],
      // we're using assert.step instead of this sort of thing
      'qunit/no-conditional-assertions': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  }),
  code('type packages', {
    filter: 'scope=@types',
    extensions: ['d.ts'],
    extends: [tslint.configs.recommendedTypeChecked],
  }),
  code('node packages', {
    filter: 'env=node',
    plugins: {
      n: node,
    },
    rules: { 'n/no-process-exit': 'error' },
  }),
  jsons
);
