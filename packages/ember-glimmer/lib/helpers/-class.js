import { InternalHelperReference } from '../utils/references';
import { dasherize } from 'ember-runtime/system/string';

function classHelper({ positional }) {
  let path = positional.at(0);
  let propName = positional.at(1);
  let value = path.value();

  if (value === true) {
    return dasherize(propName.value());
  }

  if (value === false) {
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
