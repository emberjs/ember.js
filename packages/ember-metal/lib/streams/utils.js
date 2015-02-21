import Stream from "./stream";

/**
 Check whether an object is a stream or not

 @public
 @for Ember.stream
 @function isStream
 @param {Object|Stream} object object to check whether it is a stream
 @return {Boolean} `true` if the object is a stream, `false` otherwise
*/
export function isStream(object) {
  return object && object.isStream;
}

/**
 A method of subscribing to a stream which is safe for use with a non-stream
 object. If a non-stream object is passed, the function does nothing.

 @public
 @for Ember.stream
 @function subscribe
 @param {Object|Stream} object object or stream to potentially subscribe to
 @param {Function} callback function to run when stream value changes
 @param {Object} [context] the callback will be executed with this context if it
                           is provided
 */
export function subscribe(object, callback, context) {
  if (object && object.isStream) {
    object.subscribe(callback, context);
  }
}

/**
 A method of unsubscribing from a stream which is safe for use with a non-stream
 object. If a non-stream object is passed, the function does nothing.

 @public
 @for Ember.stream
 @function unsubscribe
 @param {Object|Stream} object object or stream to potentially unsubscribe from
 @param {Function} callback function originally passed to `subscribe()`
 @param {Object} [context] object originally passed to `subscribe()`
 */
export function unsubscribe(object, callback, context) {
  if (object && object.isStream) {
    object.unsubscribe(callback, context);
  }
}

/**
 Retrieve the value of a stream, or in the case a non-stream object is passed,
 return the object itself.

 @public
 @for Ember.stream
 @function read
 @param {Object|Stream} object object to return the value of
 @return the stream's current value, or the non-stream object itself
 */
export function read(object) {
  if (object && object.isStream) {
    return object.value();
  } else {
    return object;
  }
}

/**
 Map an array, replacing any streams with their values.

 @public
 @for Ember.stream
 @function readArray
 @param {Array} array The array to read values from
 @return {Array} a new array of the same length with the values of non-stream
                 objects mapped from their original positions untouched, and
                 the values of stream objects retaining their original position
                 and replaced with the stream's current value.
 */
export function readArray(array) {
  var length = array.length;
  var ret = new Array(length);
  for (var i = 0; i < length; i++) {
    ret[i] = read(array[i]);
  }
  return ret;
}

/**
 Map a hash, replacing any stream property values with the current value of that
 stream.

 @public
 @for Ember.stream
 @function readHash
 @param {Object} object The hash to read keys and values from
 @return {Object} a new object with the same keys as the passed object. The
                  property values in the new object are the original values in
                  the case of non-stream objects, and the streams' current
                  values in the case of stream objects.
 */
export function readHash(object) {
  var ret = {};
  for (var key in object) {
    ret[key] = read(object[key]);
  }
  return ret;
}

/**
 Check whether an array contains any stream values

 @public
 @for Ember.stream
 @function scanArray
 @param {Array} array array given to a handlebars helper
 @return {Boolean} `true` if the array contains a stream/bound value, `false`
                   otherwise
*/
export function scanArray(array) {
  var length = array.length;
  var containsStream = false;

  for (var i = 0; i < length; i++) {
    if (isStream(array[i])) {
      containsStream = true;
      break;
    }
  }

  return containsStream;
}

/**
 Check whether a hash has any stream property values

 @public
 @for Ember.stream
 @function scanHash
 @param {Object} hash "hash" argument given to a handlebars helper
 @return {Boolean} `true` if the object contains a stream/bound value, `false`
                   otherwise
 */
export function scanHash(hash) {
  var containsStream = false;

  for (var prop in hash) {
    if (isStream(hash[prop])) {
      containsStream = true;
      break;
    }
  }

  return containsStream;
}

/**
 Join an array, with any streams replaced by their current values

 @public
 @for Ember.stream
 @function concat
 @param {Array} array An array containing zero or more stream objects and
                      zero or more non-stream objects
 @param {String} separator string to be used to join array elements
 @return {String} String with array elements concatenated and joined by the
                  provided separator, and any stream array members having been
                  replaced by the current value of the stream
 */
export function concat(array, separator) {
  var hasStream = scanArray(array);
  if (hasStream) {
    var i, l;
    var stream = new Stream(function() {
      return concat(readArray(array), separator);
    });

    for (i = 0, l=array.length; i < l; i++) {
      stream.addDependency(array[i]);
    }

    return stream;
  } else {
    return array.join(separator);
  }
}

/**
 Generate a new stream by providing a source stream and a function that can
 be used to transform the stream's value. In the case of a non-stream object,
 returns the result of the function.

 The value to transform would typically be available to the function you pass
 to `chain()` via scope. For example:

 ```javascript
     var source = ...;  // stream returning a number
                            // or a numeric (non-stream) object
     var result = chain(source, function() {
       var currentValue = read(source);
       return currentValue + 1;
     });
 ```

 In the example, result is a stream if source is a stream, or a number of
 source was numeric.

 @public
 @for Ember.stream
 @function chain
 @param {Object|Stream} value A stream or non-stream object
 @param {Function} fn function to be run when the stream value changes, or to
                      be run once in the case of a non-stream object
 @return {Object|Stream} In the case of a stream `value` parameter, a new
                         stream that will be updated with the return value of
                         the provided function `fn`. In the case of a
                         non-stream object, the return value of the provided
                         function `fn`.
 */
export function chain(value, fn) {
  if (isStream(value)) {
    var stream = new Stream(fn);
    subscribe(value, stream.notify, stream);
    return stream;
  } else {
    return fn();
  }
}
