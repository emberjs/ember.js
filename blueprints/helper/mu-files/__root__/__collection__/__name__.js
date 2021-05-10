import { helper as buildHelper } from '@ember/component/helper';

export function <%= camelizedModuleName %>(positional/*, named*/) {
  return positional;
}

export const helper = buildHelper(<%= camelizedModuleName %>);
