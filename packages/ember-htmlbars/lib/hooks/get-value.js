/**
@module ember
@submodule ember-htmlbars
*/

import { read } from "ember-metal/streams/utils";

export default function getValue(ref) {
  return read(ref);
}
