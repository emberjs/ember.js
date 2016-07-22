import BasicStream from './stream';
import {
  labelsFor,
  inspect,
  readArray,
  scanArray,
  addDependency
} from './utils';

const ConcatStream = BasicStream.extend({
  init(array, separator) {
    this.array = array;
    this.separator = separator;

    // Used by angle bracket components to detect an attribute was provided
    // as a string literal.
    this.isConcat = true;
  },

  label() {
    let labels = labelsFor(this.array);
    return `concat([${labels.join(', ')}]; separator=${inspect(this.separator)})`;
  },

  compute() {
    return concat(readArray(this.array), this.separator);
  }
});

/*
 Join an array, with any streams replaced by their current values.

 @private
 @for Ember.stream
 @function concat
 @param {Array} array An array containing zero or more stream objects and
                      zero or more non-stream objects.
 @param {String} separator String to be used to join array elements.
 @return {String} String with array elements concatenated and joined by the
                  provided separator, and any stream array members having been
                  replaced by the current value of the stream.
 */
export default function concat(array, separator) {
  // TODO: Create subclass ConcatStream < Stream. Defer
  // subscribing to streams until the value() is called.
  let hasStream = scanArray(array);
  if (hasStream) {
    let stream = new ConcatStream(array, separator);

    for (let i = 0; i < array.length; i++) {
      addDependency(stream, array[i]);
    }

    return stream;
  } else {
    return array.join(separator);
  }
}
