var errorProps = [
  'description',
  'fileName',
  'lineNumber',
  'message',
  'name',
  'number',
  'stack'
];

/**
  A subclass of the JavaScript Error object for use in Ember.

  @class Error
  @namespace Ember
  @extends Error
  @constructor
  @public
*/
export default function EmberError() {
  var tmp = Error.apply(this, arguments);

  // Adds a `stack` property to the given error object that will yield the
  // stack trace at the time captureStackTrace was called.
  // When collecting the stack trace all frames above the topmost call
  // to this function, including that call, will be left out of the
  // stack trace.
  // This is useful because we can hide Ember implementation details
  // that are not very helpful for the user.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, Ember.Error);
  }
  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }
}

EmberError.prototype = Object.create(Error.prototype);
