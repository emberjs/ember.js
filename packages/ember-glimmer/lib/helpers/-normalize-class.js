import { InternalHelperReference } from '../utils/references';
import { dasherize } from 'ember-runtime/system/string';

function normalizeClass({ positional, named }) {
  let classNameParts = positional.at(0).value().split('.');
  let className = classNameParts[classNameParts.length - 1];
  let value = positional.at(1).value();

  if (value === true) {
    return dasherize(className);
  } else if (!value && value !== 0) {
    return '';
  } else {
    return String(value);
  }
}

export default {
  isInternalHelper: true,
  toReference(args) {
    return new InternalHelperReference(normalizeClass, args);
  }
};
