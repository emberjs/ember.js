import { helper as buildHelper } from '@ember/component/helper';

export function fooBarBaz(positional /*, named*/) {
  return positional;
}

export const helper = buildHelper(fooBarBaz);
