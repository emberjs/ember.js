import type { CapturedArguments } from '@glimmer/interfaces';
import { createComputeRef } from '@glimmer/reference/lib/reference';

import { reifyPositional } from '../vm/arguments';
import { internalHelper } from './internal-helper';

const isEmpty = (value: unknown): boolean => {
  return value === null || value === undefined || typeof value.toString !== 'function';
};

const normalizeTextValue = (value: unknown): string => {
  if (isEmpty(value)) {
    return '';
  }
  return String(value);
};

export const concat = internalHelper(({ positional }: CapturedArguments) => {
  return createComputeRef(
    () => reifyPositional(positional).map(normalizeTextValue).join(''),
    null,
    'concat'
  );
});
