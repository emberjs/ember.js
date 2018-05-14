/**
 @module @ember/error
*/
function ExtendBuiltin(klass: any): typeof Error {
  function ExtendableBuiltin(this: any) {
    klass.apply(this, arguments);
  }

  ExtendableBuiltin.prototype = Object.create(klass.prototype);
  ExtendableBuiltin.prototype.constructor = ExtendableBuiltin;
  return ExtendableBuiltin as typeof Error;
}

/**
  A subclass of the JavaScript Error object for use in Ember.

  @class EmberError
  @extends Error
  @constructor
  @public
*/
export default class EmberError extends ExtendBuiltin(Error) {
  description: string;
  fileName: string;
  lineNumber: number;
  number: number;
  code: string;

  constructor(message: string) {
    super();

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
}
