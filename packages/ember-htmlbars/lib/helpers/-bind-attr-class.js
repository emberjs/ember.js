/**
@module ember
@submodule ember-htmlbars
*/

import { get } from 'ember-metal/property_get';

export default function bindAttrClassHelper(params) {
  var value = params[0];

  if (Array.isArray(value)) {
    value = get(value, 'length') !== 0;
  }

  if (value === true) {
    return params[1];
  } if (value === false || value === undefined || value === null) {
    return '';
  } else {
    return value;
  }
}
