/**
  A subclass of the JavaScript Error object for use in Ember.

  @class Error
  @namespace Ember
  @extends Error
  @constructor
  @public
*/

export default EmberError;
function EmberError(message, code) {
  if (this instanceof EmberError) {
    let error = Error.call(this, message, code);

    this.stack = error.stack;
    this.description = error.description;
    this.fileName = error.fileName;
    this.lineNumber = error.lineNumber;
    this.message = error.message;
    this.name = error.name;
    this.number = error.number;
    this.code = error.code;
  } else {
    return new EmberError(message, code);
  }
}

EmberError.prototype = Object.create(Error.prototype);
EmberError.constructor = EmberError;
