/**
  A subclass of the JavaScript Error object for use in Ember.

  @class Error
  @namespace Ember
  @extends Error
  @constructor
  @public
*/
export default function EmberError(message) {
  if (!(this instanceof EmberError)) {
    return new EmberError(message);
  }

  let error = Error.call(this, message);

  this.stack = error.stack;
  this.description = error.description;
  this.fileName = error.fileName;
  this.lineNumber = error.lineNumber;
  this.message = error.message;
  this.name = error.name;
  this.number = error.number;
  this.code = error.code;
}

EmberError.prototype = Object.create(Error.prototype);
EmberError.prototype.constructor = EmberError;
