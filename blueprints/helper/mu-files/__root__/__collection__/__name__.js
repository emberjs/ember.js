import { helper as buildHelper } from '@ember/component/helper';

export function <%= camelizedModuleName %>(params/*, hash*/) {
  return params;
}

export const helper = buildHelper(<%= camelizedModuleName %>);
