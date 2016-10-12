import { symbol } from 'ember-utils';

export const IS_PROXY = symbol('IS_PROXY');

export function isProxy(value) {
  return typeof value === 'object' && value && value[IS_PROXY];
}
