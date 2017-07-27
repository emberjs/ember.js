import { helper } from '@ember/component/helper';

export function <%= camelizedModuleName %>(params/*, hash*/) {
  return params;
}

export default helper(<%= camelizedModuleName %>);
