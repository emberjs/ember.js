import { InternalHelperReference } from '../utils/references';
import { dasherize } from 'ember-runtime/system/string';

function classHelper({ positional }) {
  let path = positional.at(0);
  let truthyPropName = positional.at(1);
  let falsyPropName = positional.at(2);
  let value = path.value();

  if (value === true) {
    if (truthyPropName) {
      return dasherize(truthyPropName.value());
    }
    return null;
  }

  if (value === false) {
    if (falsyPropName) {
      return dasherize(falsyPropName.value());
    }
    return null;
  }

  return value;
}

export default {
  isInternalHelper: true,
  toReference(args) {
    return new InternalHelperReference(classHelper, args);
  }
};
