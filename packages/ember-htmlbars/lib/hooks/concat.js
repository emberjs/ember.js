/**
@module ember
@submodule ember-htmlbars
*/

import {
  concat as streamConcat
} from "ember-metal/streams/utils";

export default function concat(params) {
  return streamConcat(params, '');
}

