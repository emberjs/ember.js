/**
@module ember
@submodule ember-htmlbars
*/

import { read } from 'ember-metal/streams/utils';
import { MUTABLE_CELL } from 'ember-views/compat/attrs-proxy';

export default function getValue(ref) {
  let value = read(ref);

  if (value && value[MUTABLE_CELL]) {
    return value.value;
  }

  return value;
}
