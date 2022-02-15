import { helper } from '@ember/component/helper';

export default helper(function <%= camelizedModuleName %>(positional /*, named*/) {
  return positional;
});
