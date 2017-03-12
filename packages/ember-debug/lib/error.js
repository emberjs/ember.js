/**
  A subclass of the JavaScript Error object for use in Ember.

  @class Error
  @namespace Ember
  @extends Error
  @constructor
  @public
*/
export default class EmberError extends Error {
  constructor(message) {
    super();

    if (!(this instanceof EmberError)) {
      return new EmberError(message);
    }

    let error = Error.call(this, message);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EmberError);
    } else {
      this.stack = error.stack;
    }

    this.description = error.description;
    this.fileName = error.fileName;
    this.lineNumber = error.lineNumber;
    this.message = error.message;
    this.name = error.name;
    this.number = error.number;
    this.code = error.code;
  }
}