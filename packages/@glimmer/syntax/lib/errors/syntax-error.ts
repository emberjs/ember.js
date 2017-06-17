import * as AST from '../types/nodes';

export interface SyntaxError extends Error {
  location: AST.SourceLocation;
  constructor: SyntaxErrorConstructor;
}

export interface SyntaxErrorConstructor {
  new (message: string, location: AST.SourceLocation): SyntaxError;
  readonly prototype: SyntaxError;
}

/**
 * Subclass of `Error` with additional information
 * about location of incorrect markup.
 */
const SyntaxError: SyntaxErrorConstructor = (function () {
  SyntaxError.prototype = Object.create(Error.prototype);
  SyntaxError.prototype.constructor = SyntaxError;

  function SyntaxError(this: SyntaxError, message: string, location: AST.SourceLocation) {
    let error = Error.call(this, message);

    this.message = message;
    this.stack = error.stack;
    this.location = location;
  }

  return SyntaxError as any;
}());

export default SyntaxError;
