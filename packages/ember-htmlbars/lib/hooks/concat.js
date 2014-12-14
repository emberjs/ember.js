/**
@module ember
@submodule ember-htmlbars
*/

import Stream from "ember-metal/streams/stream";
import {
  isStream,
  readArray,
  read,
  subscribe
} from "ember-metal/streams/utils";

// TODO: Create subclass ConcatStream < Stream. Defer
// subscribing to streams until the value() is called.
export default function concat(params, hash) {
  var joinWith = read(hash.joinWith) || '';
  var i;
  var isStatic = true;

  for (i = 0; i < params.length; i++) {
    if (isStream(params[i])) {
      isStatic = false;
      break;
    }
  }

  if (isStatic) {
    return params.join(joinWith);
  } else {
    var stream = new Stream(function() {
      return readArray(params).join(joinWith);
    });

    for (i = 0; i < params.length; i++) {
      subscribe(params[i], stream.notify, stream);
    }

    return stream;
  }

}

