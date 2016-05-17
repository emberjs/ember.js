import getValue from 'ember-htmlbars/hooks/get-value';
import { assert } from 'ember-metal/debug';
import BasicStream, { Stream, IS_STREAM } from './stream';
import { get } from 'ember-metal/property_get';
import ControllerMixin from 'ember-runtime/mixins/controller';

// We don't want to leak mutable cells into helpers, which
// are pure functions that can only work with values.
export function getArrayValues(params) {
  let out = new Array(params.length);

  for (let i = 0; i < params.length; i++) {
    out[i] = getValue(params[i]);
  }

  return out;
}

export function getHashValues(hash) {
  let out = {};

  for (let prop in hash) {
    out[prop] = getValue(hash[prop]);
  }

  return out;
}

/*
 Check whether an object is a stream or not.

 @private
 @for Ember.stream
 @function isStream
 @param {Object|Stream} object Object to check whether it is a stream.
 @return {Boolean} `true` if the object is a stream, `false` otherwise.
*/
export function isStream(object) {
  return object && object[IS_STREAM];
}

/*
 A method of subscribing to a stream which is safe for use with a non-stream
 object. If a non-stream object is passed, the function does nothing.

 @public
 @for Ember.stream
 @function subscribe
 @param {Object|Stream} object Object or stream to potentially subscribe to.
 @param {Function} callback Function to run when stream value changes.
 @param {Object} [context] the callback will be executed with this context if it
                           is provided.
 */
export function subscribe(object, callback, context) {
  if (object && object[IS_STREAM]) {
    return object.subscribe(callback, context);
  }
}

/*
 A method of unsubscribing from a stream which is safe for use with a non-stream
 object. If a non-stream object is passed, the function does nothing.

 @private
 @for Ember.stream
 @function unsubscribe
 @param {Object|Stream} object Object or stream to potentially unsubscribe from.
 @param {Function} callback Function originally passed to `subscribe()`.
 @param {Object} [context] Object originally passed to `subscribe()`.
 */
export function unsubscribe(object, callback, context) {
  if (object && object[IS_STREAM]) {
    object.unsubscribe(callback, context);
  }
}

/*
 Retrieve the value of a stream, or in the case where a non-stream object is passed,
 return the object itself.

 @private
 @for Ember.stream
 @function read
 @param {Object|Stream} object Object to return the value of.
 @return The stream's current value, or the non-stream object itself.
 */
export function read(object) {
  if (object && object[IS_STREAM]) {
    return object.value();
  } else {
    return object;
  }
}

/*
 Map an array, replacing any streams with their values.

 @private
 @for Ember.stream
 @function readArray
 @param {Array} array The array to read values from
 @return {Array} A new array of the same length with the values of non-stream
                 objects mapped from their original positions untouched, and
                 the values of stream objects retaining their original position
                 and replaced with the stream's current value.
 */
export function readArray(array) {
  var ret = new Array(array.length);
  for (var i = 0; i < array.length; i++) {
    ret[i] = read(array[i]);
  }
  return ret;
}

/*
 Map a hash, replacing any stream property values with the current value of that
 stream.

 @private
 @for Ember.stream
 @function readHash
 @param {Object} object The hash to read keys and values from.
 @return {Object} A new object with the same keys as the passed object. The
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

/*
 Check whether an array contains any stream values.

 @private
 @for Ember.stream
 @function scanArray
 @param {Array} array Array given to a handlebars helper.
 @return {Boolean} `true` if the array contains a stream/bound value, `false`
                   otherwise.
*/
export function scanArray(array) {
  var containsStream = false;

  for (var i = 0; i < array.length; i++) {
    if (isStream(array[i])) {
      containsStream = true;
      break;
    }
  }

  return containsStream;
}

/*
 Check whether a hash has any stream property values.

 @private
 @for Ember.stream
 @function scanHash
 @param {Object} hash "hash" argument given to a handlebars helper.
 @return {Boolean} `true` if the object contains a stream/bound value, `false`
                   otherwise.
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

let ConcatStream = BasicStream.extend({
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
export function concat(array, separator) {
  // TODO: Create subclass ConcatStream < Stream. Defer
  // subscribing to streams until the value() is called.
  var hasStream = scanArray(array);
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

export function labelsFor(streams) {
  var labels =  [];

  for (var i = 0; i < streams.length; i++) {
    var stream = streams[i];
    labels.push(labelFor(stream));
  }

  return labels;
}

export function labelsForObject(streams) {
  var labels = [];

  for (var prop in streams) {
    labels.push(`${prop}: ${inspect(streams[prop])}`);
  }

  return labels.length ? `{ ${labels.join(', ')} }` : '{}';
}

export function labelFor(maybeStream) {
  if (isStream(maybeStream)) {
    var stream = maybeStream;
    return typeof stream.label === 'function' ? stream.label() : stream.label;
  } else {
    return inspect(maybeStream);
  }
}

function inspect(value) {
  switch (typeof value) {
    case 'string': return `"${value}"`;
    case 'object': return '{ ... }';
    case 'function': return 'function() { ... }';
    default: return String(value);
  }
}

export function or(first, second) {
  var stream = new Stream(function() {
    return first.value() || second.value();
  }, function() {
    return `${labelFor(first)} || ${labelFor(second)}`;
  });

  stream.addDependency(first);
  stream.addDependency(second);

  return stream;
}

export function addDependency(stream, dependency) {
  assert('Cannot add a stream as a dependency to a non-stream', isStream(stream) || !isStream(dependency));
  if (isStream(stream)) {
    stream.addDependency(dependency);
  }
}

export function zip(streams, callback, label) {
  assert('Must call zip with a label', !!label);

  var stream = new Stream(function() {
    var array = readArray(streams);
    return callback ? callback(array) : array;
  }, function() {
    return `${label}(${labelsFor(streams)})`;
  });

  for (var i = 0; i < streams.length; i++) {
    stream.addDependency(streams[i]);
  }

  return stream;
}

export function zipHash(object, callback, label) {
  assert('Must call zipHash with a label', !!label);

  var stream = new Stream(function() {
    var hash = readHash(object);
    return callback ? callback(hash) : hash;
  }, function() {
    return `${label}(${labelsForObject(object)})`;
  });

  for (var prop in object) {
    stream.addDependency(object[prop]);
  }

  return stream;
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

 @private
 @for Ember.stream
 @function chain
 @param {Object|Stream} value A stream or non-stream object.
 @param {Function} fn Function to be run when the stream value changes, or to
                      be run once in the case of a non-stream object.
 @return {Object|Stream} In the case of a stream `value` parameter, a new
                         stream that will be updated with the return value of
                         the provided function `fn`. In the case of a
                         non-stream object, the return value of the provided
                         function `fn`.
 */
export function chain(value, fn, label) {
  assert('Must call chain with a label', !!label);
  if (isStream(value)) {
    var stream = new Stream(fn, function() { return `${label}(${labelFor(value)})`; });
    stream.addDependency(value);
    return stream;
  } else {
    return fn();
  }
}

export function setValue(object, value) {
  if (object && object[IS_STREAM]) {
    object.setValue(value);
  }
}

export function readViewFactory(object, owner) {
  var value = read(object);
  var viewClass;

  if (typeof value === 'string') {
    assert('View requires an owner to resolve views not passed in through the context', !!owner);
    viewClass = owner._lookupFactory('view:' + value);
  } else {
    viewClass = value;
  }

  assert(`${value} must be a subclass or an instance of Ember.View, not ${viewClass}`, (function(viewClass) {
    return viewClass && (viewClass.isViewFactory || viewClass.isView || viewClass.isComponentFactory || viewClass.isComponent);
  })(viewClass));

  return viewClass;
}

export function readUnwrappedModel(object) {
  if (isStream(object)) {
    var result = object.value();

    // If the path is exactly `controller` then we don't unwrap it.
    if (object.label !== 'controller') {
      while (ControllerMixin.detect(result)) {
        result = get(result, 'model');
      }
    }

    return result;
  } else {
    return object;
  }
}
