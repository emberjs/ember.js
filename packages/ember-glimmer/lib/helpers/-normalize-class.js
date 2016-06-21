import { InternalHelperReference } from '../utils/references';
import { dasherize } from 'ember-runtime/system/string';

function normalizeClass({ positional, named }) {
  let value = positional.at(1).value();
  let activeClass = named.at('activeClass').value();
  let inactiveClass = named.at('inactiveClass').value();

  // When using the colon syntax, evaluate the truthiness or falsiness
  // of the value to determine which className to return.
  if (activeClass || inactiveClass) {
    if (!!value) {
      return activeClass;
    } else {
      return inactiveClass;
    }

  // If value is a Boolean and true, return the dasherized property
  // name.
  } else if (value === true) {
    let propName = positional.at(0);
    // Only apply to last segment in the path.
    if (propName) {
      let segments = propName.split('.');
      propName = segments[segments.length - 1];
    }

    return dasherize(propName);

  // If the value is not false, undefined, or null, return the current
  // value of the property.
  } else if (value !== false && value != null) {
    return value;

  // Nothing to display. Return null so that the old class is removed
  // but no new class is added.
  } else {
    return null;
  }
}

export default {
  isInternalHelper: true,
  toReference(args) {
    return new InternalHelperReference(normalizeClass, args);
  }
};
