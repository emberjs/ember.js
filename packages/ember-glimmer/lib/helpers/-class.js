import { InternalHelperReference } from '../utils/references';
import { dasherize } from 'ember-runtime/system/string';

function classHelper({ positional }) {
  let path = positional.at(0);
  let args = positional.length;
  let value = path.value();

  if (value === true) {
    if (args > 1) {
      return dasherize(positional.at(1).value());
    }
    return null;
  }

  if (value === false) {
    if (args > 2) {
      return dasherize(positional.at(2).value());
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
