/**
@module ember
@submodule ember-htmlbars
*/

import Stream from "ember-metal/streams/stream";
import {readArray} from "ember-metal/streams/utils";

export default function concat(params) {
  var stream = new Stream(function() {
    return readArray(params).join('');
  });

  for (var i = 0, l = params.length; i < l; i++) {
    var param = params[i];

    if (param && param.isStream) {
      param.subscribe(stream.notify, stream);
    }
  }

  return stream;
}

