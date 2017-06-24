import Ember from 'ember';
const { Helper } = Ember;

export function <%= camelizedModuleName %>(params/*, hash*/) {
  return params;
}

export default Helper.helper(<%= camelizedModuleName %>);
