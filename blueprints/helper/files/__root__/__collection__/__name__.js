import { helper } from '@ember/component/helper';

export default helper(function <%= camelizedModuleName %>(params/*, hash*/) {
  return params;
});
