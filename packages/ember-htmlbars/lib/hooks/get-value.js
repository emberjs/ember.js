/**
@module ember
@submodule ember-htmlbars
*/

import { isStream } from "ember-metal/streams/utils";

export default function getValue(value) {
  if (isStream(value)) {
    return value.value();
  } else {
    return value;
  }
}
