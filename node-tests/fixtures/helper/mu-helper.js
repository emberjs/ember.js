import { helper as buildHelper } from '@ember/component/helper';

export function fooBarBaz(params/*, hash*/) {
  return params;
}

export const helper = buildHelper(fooBarBaz);
