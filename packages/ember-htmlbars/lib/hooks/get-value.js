/**
@module ember
@submodule ember-htmlbars
*/

import { read } from "ember-metal/streams/utils";
import { isMutableBinding } from "ember-htmlbars/keywords/mut";

export default function getValue(ref) {
  if (ref && ref.isMutableBinding === isMutableBinding) {
    return read(ref).value();
  } else {
    return read(ref);
  }
}
