import Stream from "ember-metal/streams/stream";
import {readArray} from "ember-metal/streams/read";

export function concat(params, options) {
  var stream = new Stream(function() {
    return readArray(params).join('');
  });

  for (var i = 0, l = params.length; i < l; i++) {
    var param = params[i];

    if (param && param.isStream) {
      param.subscribe(stream.notifyAll, stream);
    }
  }

  return stream;
}
